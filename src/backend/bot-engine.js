import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import * as logger from "./logger.js";

/**
 * @typedef {import('./poker/types.js').Cents} Cents
 * @typedef {import('./poker/deck.js').Card} Card
 * @typedef {{ type: "fold" } | { type: "call" } | { type: "raise", to: Cents }} EngineAction - `call` also checks; `to` is the total street commitment
 * @typedef {EngineAction & { p: number }} EngineChoice
 * @typedef {"blueprint"|"unseen"|"capped"|"search"} EngineSource
 * @typedef {{ strategy: EngineChoice[], source: EngineSource }} EngineDecision
 *
 * @typedef {object} EngineRequest
 * @property {number} button
 * @property {Cents[]} stacks - Stacks at the start of the hand, before blinds
 * @property {number} seat - The seat to act
 * @property {Card[]} hole
 * @property {Card[]} board
 * @property {EngineAction[]} actions - Every betting action of the hand so far
 *
 * @typedef {object} BotEngine
 * @property {() => boolean} isReady
 * @property {(request: EngineRequest) => Promise<EngineDecision>} decide
 * @property {() => void} close
 */

/** A lookup takes milliseconds; an engine this slow is stuck. */
const REQUEST_TIMEOUT_MS = 5000;
const FIRST_RESTART_DELAY_MS = 1000;
const MAX_RESTART_DELAY_MS = 60_000;
const SOURCES = ["blueprint", "unseen", "capped", "search"];

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return typeof value === "object" && Boolean(value) && !Array.isArray(value);
}

/**
 * @param {unknown} choice
 * @returns {EngineChoice}
 */
function parseChoice(choice) {
  if (
    !isRecord(choice) ||
    typeof choice.p !== "number" ||
    !Number.isFinite(choice.p) ||
    choice.p < 0
  ) {
    throw new Error("strategy choices need a probability");
  }
  if (choice.type === "fold" || choice.type === "call") {
    return { type: choice.type, p: choice.p };
  }
  if (
    choice.type === "raise" &&
    Number.isInteger(choice.to) &&
    /** @type {number} */ (choice.to) > 0
  ) {
    return {
      type: "raise",
      to: /** @type {number} */ (choice.to),
      p: choice.p,
    };
  }
  throw new Error(`unknown strategy choice ${JSON.stringify(choice)}`);
}

/**
 * Validates a decision line from the engine, a system boundary.
 * @param {Record<string, unknown>} message
 * @returns {EngineDecision}
 */
function parseDecision(message) {
  const { strategy, source } = message;
  if (!Array.isArray(strategy) || strategy.length === 0) {
    throw new Error("the strategy must list at least one choice");
  }
  if (!SOURCES.includes(/** @type {string} */ (source))) {
    throw new Error(`unknown strategy source ${JSON.stringify(source)}`);
  }
  const choices = strategy.map(parseChoice);
  if (!choices.some((choice) => choice.p > 0)) {
    throw new Error("the strategy must give some choice a probability");
  }
  return { strategy: choices, source: /** @type {EngineSource} */ (source) };
}

/**
 * Runs the noregrets engine's `serve` command as a child process and answers
 * decision requests over its JSON-lines protocol. The process restarts after
 * a crash, with growing delays while it keeps failing. Requests are
 * stateless, so a restart loses nothing.
 * @param {{ command: string, args: string[] }} options
 * @returns {BotEngine}
 */
export function createBotEngine({ command, args }) {
  let ready = false;
  let closed = false;
  let nextId = 0;
  let restartDelayMs = FIRST_RESTART_DELAY_MS;
  /** @type {NodeJS.Timeout|undefined} */
  let restartTimer;
  /** @type {import('node:child_process').ChildProcessWithoutNullStreams} */
  let child;
  /** @type {Map<number, { resolve: (decision: EngineDecision) => void, reject: (error: Error) => void, timer: NodeJS.Timeout }>} */
  const pending = new Map();

  /** @param {Error} error */
  function rejectAll(error) {
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(error);
    }
    pending.clear();
  }

  /**
   * @param {number} id
   * @returns {{ resolve: (decision: EngineDecision) => void, reject: (error: Error) => void }|undefined}
   */
  function takePending(id) {
    const request = pending.get(id);
    if (!request) return;
    clearTimeout(request.timer);
    pending.delete(id);
    return request;
  }

  /** @param {string} line */
  function handleLine(line) {
    /** @type {unknown} */
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      message = undefined;
    }
    if (!isRecord(message)) {
      logger.error("bot engine wrote an invalid line", { engine: { line } });
      return;
    }

    if (message.ready === true) {
      ready = true;
      restartDelayMs = FIRST_RESTART_DELAY_MS;
      logger.info("bot engine ready", {
        engine: { infosets: message.infosets },
      });
      return;
    }

    const request =
      typeof message.id === "number" ? takePending(message.id) : undefined;
    if (!request) {
      logger.error("bot engine answered an unknown request", {
        engine: { line },
      });
      return;
    }
    if (typeof message.error === "string") {
      request.reject(new Error(message.error));
      return;
    }
    try {
      request.resolve(parseDecision(message));
    } catch (err) {
      request.reject(err);
    }
  }

  function start() {
    restartTimer = undefined;
    child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"] });
    const proc = child;
    // A dead engine closes its pipe; the close handler below reports it.
    proc.stdin.on("error", () => {});
    proc.on("error", (err) => {
      logger.error("bot engine failed to start", {
        engine: { command },
        error: { message: err.message },
      });
    });
    createInterface({ input: proc.stdout }).on("line", handleLine);
    createInterface({ input: proc.stderr }).on("line", (line) => {
      logger.info("bot engine output", { engine: { line } });
    });
    proc.on("close", (code, signal) => {
      if (proc !== child) return;
      ready = false;
      rejectAll(new Error("bot engine exited"));
      if (closed) return;
      logger.error("bot engine exited", {
        engine: { code, signal, restartInMs: restartDelayMs },
      });
      restartTimer = setTimeout(start, restartDelayMs);
      restartTimer.unref();
      restartDelayMs = Math.min(restartDelayMs * 2, MAX_RESTART_DELAY_MS);
    });
  }

  start();

  return {
    isReady: () => ready,

    decide(request) {
      if (!ready) {
        return Promise.reject(new Error("bot engine is not ready"));
      }
      const id = nextId++;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          takePending(id);
          reject(new Error("bot engine timed out"));
          // Restart it rather than queue more requests behind a stuck one.
          child.kill();
        }, REQUEST_TIMEOUT_MS);
        pending.set(id, { resolve, reject, timer });
        child.stdin.write(`${JSON.stringify({ id, ...request })}\n`);
      });
    },

    close() {
      closed = true;
      ready = false;
      clearTimeout(restartTimer);
      rejectAll(new Error("bot engine closed"));
      child.kill();
    },
  };
}

/**
 * Stands in when no engine is configured, as in most development setups:
 * the bots stay unavailable.
 * @type {BotEngine}
 */
export const UNAVAILABLE_BOT_ENGINE = {
  isReady: () => false,
  decide: () => Promise.reject(new Error("no bot engine is configured")),
  close: () => {},
};
