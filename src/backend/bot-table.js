import * as PokerGame from "./poker/game.js";
import * as Seat from "./poker/seat.js";
import * as Actions from "./poker/actions.js";
import * as Betting from "./poker/betting.js";
import * as HandHistory from "./poker/hand-history/index.js";
import { random } from "./poker/rng.js";
import { BOT_TABLE_STACK_BIG_BLINDS } from "./poker/game-constants.js";
import { applyGameAction } from "./websocket-handler.js";
import { createLog, emitLog } from "./logger.js";
import { BOTS } from "./bot-roster.js";
import { snapToStep } from "../shared/snap-to-step.js";

/**
 * @typedef {import('./poker/game.js').Game} Game
 * @typedef {import('./poker/game.js').BroadcastHandler} BroadcastHandler
 * @typedef {import('./poker/seat.js').Player} Player
 * @typedef {import('./poker/seat.js').OccupiedSeat} OccupiedSeat
 * @typedef {import('./bot-engine.js').BotEngine} BotEngine
 * @typedef {import('./bot-engine.js').EngineAction} EngineAction
 * @typedef {import('./bot-engine.js').EngineChoice} EngineChoice
 * @typedef {import('./bot-engine.js').EngineRequest} EngineRequest
 * @typedef {{ action: "fold"|"check"|"call"|"allIn" } | { action: "bet"|"raise", amount: number }} BotAction
 */

const TABLE_SIZE = 6;

/**
 * The engine counts chips at 50/100 blinds. At $0.50/$1 one cent is one chip,
 * so amounts need no scaling, and 100 BB is its 10,000-chip training stack.
 */
const BLINDS = { ante: 0, small: 50, big: 100 };

/** @type {Record<string, EngineAction["type"]>} */
const ENGINE_ACTION_TYPES = {
  Fold: "fold",
  Check: "call",
  Call: "call",
  Bet: "raise",
  Raise: "raise",
};

/**
 * @template T
 * @param {readonly T[]} items
 * @returns {T[]}
 */
function shuffled(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [
      /** @type {T} */ (result[j]),
      /** @type {T} */ (result[i]),
    ];
  }
  return result;
}

/**
 * A private six-handed table: the learner and five bots, all at 100 BB. The
 * first hand's countdown is already set, and it runs once the learner
 * connects and the table's clock starts.
 * @param {Player} learner
 * @returns {Game}
 */
export function createBotTable(learner) {
  const game = PokerGame.create({
    kind: "bots",
    seats: TABLE_SIZE,
    blinds: BLINDS,
    tableName: "Bot table",
  });
  const stack = BOT_TABLE_STACK_BIG_BLINDS * BLINDS.big;
  const bots = shuffled(BOTS).slice(0, TABLE_SIZE - 1);
  game.seats = [
    Seat.occupied(learner, stack),
    ...bots.map((bot) => Seat.occupied({ ...bot.player }, stack)),
  ];
  game.button = Math.floor(random() * TABLE_SIZE);
  Actions.start(game);
  return game;
}

/**
 * @param {Game} game
 * @param {string} playerId
 * @returns {boolean}
 */
export function isBotTableLearner(game, playerId) {
  return game.seats.some(
    (seat) => !seat.empty && !seat.player.bot && seat.player.id === playerId,
  );
}

/**
 * Describes the hand so far as the acting bot may know it: its own cards,
 * the board, the starting stacks and every action, taken from the hand's
 * history.
 * @param {Game} game
 * @param {number} seatIndex
 * @returns {EngineRequest}
 */
export function buildEngineRequest(game, seatIndex) {
  const recorder = HandHistory.getRecorder(game.id);
  const seat = /** @type {OccupiedSeat} */ (game.seats[seatIndex]);
  return {
    button: game.button,
    stacks: game.seats.map((_, index) => {
      const player = recorder.players.find((p) => p.seat === index + 1);
      if (!player) throw new Error(`seat ${index} is not in the hand`);
      return player.starting_stack;
    }),
    seat: seatIndex,
    hole: seat.cards,
    board: game.board.cards,
    actions: recorder.actions.flatMap((action) => {
      const type = ENGINE_ACTION_TYPES[action.action];
      if (!type) return [];
      return [
        type === "raise"
          ? { type, to: /** @type {number} */ (action.amount) }
          : { type },
      ];
    }),
  };
}

/**
 * Picks a choice from a mixed strategy.
 * @param {EngineChoice[]} strategy
 * @param {number} r - Uniform in [0, 1)
 * @returns {EngineChoice}
 */
export function sampleStrategy(strategy, r) {
  const total = strategy.reduce((sum, choice) => sum + choice.p, 0);
  let cumulative = 0;
  for (const choice of strategy) {
    cumulative += choice.p;
    if (r * total < cumulative) return choice;
  }
  // Rounding can leave r * total just past the last cumulative sum.
  return /** @type {EngineChoice} */ (
    strategy.findLast((choice) => choice.p > 0)
  );
}

/**
 * Turns the engine's action into a legal action at this table.
 * @param {Game} game
 * @param {number} seatIndex
 * @param {EngineAction} choice
 * @returns {BotAction}
 */
export function toBotAction(game, seatIndex, choice) {
  const seat = /** @type {OccupiedSeat} */ (game.seats[seatIndex]);
  const owes = seat.bet < game.hand.currentBet;
  if (choice.type !== "raise") {
    if (!owes) return { action: "check" };
    return { action: choice.type };
  }
  const allInTo = seat.bet + seat.stack;
  const minimum =
    game.hand.currentBet === 0
      ? Betting.getMinBet(game)
      : Betting.getMinRaise(game);
  if (Math.max(choice.to, minimum) >= allInTo) return { action: "allIn" };
  // The engine sizes by pot fractions; the table only takes whole chips.
  const amount = snapToStep(choice.to, {
    min: minimum,
    max: allInTo,
    step: Betting.getBetStep(game),
  });
  if (amount === allInTo) return { action: "allIn" };
  return { action: game.hand.currentBet === 0 ? "bet" : "raise", amount };
}

/**
 * Plays the bot seats of bot tables. It runs on every state broadcast: when
 * a bot is to act, it asks the engine once per decision and applies a
 * sampled action. Engine failures make the bot check, or fold if it cannot.
 * It also deals again whenever a table can deal but has no countdown, for
 * example after the learner sits back in.
 * @param {{ engine: BotEngine, games: Map<string, Game>, broadcast: BroadcastHandler }} deps
 * @returns {(gameId: string) => void}
 */
export function createBotDriver({ engine, games, broadcast }) {
  /** @type {WeakMap<Game, string>} the decision each table awaits */
  const awaiting = new WeakMap();

  /**
   * One key per decision: any action, by anyone, changes it.
   * @param {Game} game
   */
  function decisionKey(game) {
    const recorder = HandHistory.getRecorder(game.id);
    return `${game.handNumber}:${game.hand.actingSeat}:${recorder.actions.length}`;
  }

  /**
   * @param {Game} game
   * @param {number} seatIndex
   * @param {string} key
   */
  async function decide(game, seatIndex, key) {
    const log = createLog("bot_action");
    log.context.game = {
      tableId: game.id,
      handNumber: game.handNumber,
      seat: seatIndex,
    };
    /** @type {EngineChoice|undefined} */
    let choice;
    try {
      // Hands at bot tables are not recorded, so the log keeps all a replay
      // needs: the request, the strategy it got and the sampled draw.
      const request = buildEngineRequest(game, seatIndex);
      log.context.engine = { request };
      const decision = await engine.decide(request);
      const sample = random();
      choice = sampleStrategy(decision.strategy, sample);
      log.context.engine = {
        request,
        source: decision.source,
        strategy: decision.strategy,
        sample,
        choice,
      };
    } catch (err) {
      log.context.error = { message: err.message };
    }

    if (games.get(game.id) !== game || decisionKey(game) !== key) {
      log.context.stale = true;
      emitLog(log);
      return;
    }
    awaiting.delete(game);
    const seat = /** @type {OccupiedSeat} */ (game.seats[seatIndex]);
    const owes = seat.bet < game.hand.currentBet;
    const fallback = owes ? "fold" : "check";
    try {
      const { action, ...args } = choice
        ? toBotAction(game, seatIndex, choice)
        : { action: fallback };
      log.context.action = { name: action, ...args };
      applyGameAction(
        game,
        seat.player,
        action,
        { seat: seatIndex, ...args },
        broadcast,
      );
    } catch (err) {
      log.context.error = { message: err.message };
      log.context.action = { name: fallback };
      applyGameAction(
        game,
        seat.player,
        fallback,
        { seat: seatIndex },
        broadcast,
      );
    } finally {
      emitLog(log);
    }
  }

  /**
   * @param {Game} game
   * @returns {number|undefined} the acting seat, if a bot sits there
   */
  function getActingBotSeat(game) {
    const seatIndex = game.hand.actingSeat;
    if (seatIndex === -1) return;
    const seat = game.seats[seatIndex];
    if (!seat || seat.empty) {
      throw new Error(`seat ${seatIndex} is to act but has no player`);
    }
    return seat.player.bot ? seatIndex : undefined;
  }

  return function driveBots(gameId) {
    const game = games.get(gameId);
    if (game?.kind !== "bots") return;

    if (game.hand.phase === "waiting") {
      if (game.countdown === undefined && Actions.canDealHand(game)) {
        Actions.start(game);
        PokerGame.ensureGameTick(game, broadcast);
      }
      return;
    }

    const seatIndex = getActingBotSeat(game);
    if (seatIndex === undefined) return;
    const key = decisionKey(game);
    if (awaiting.get(game) === key) return;
    awaiting.set(game, key);
    void decide(game, seatIndex, key);
  };
}
