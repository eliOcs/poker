/**
 * Learning contracts. A hand class (AKs, AKo, AA) is distinct from a card rank
 * or a dealt card. Range membership enforces canonical high-rank-first notation.
 *
 * @typedef {import('./poker/deck.js').Rank} Rank
 * @typedef {import('./poker/deck.js').Card} Card
 * @typedef {import('./poker/types.js').Cents} Cents
 * @typedef {{[R in Rank]: `${R}${R}` | `${R}${Exclude<Rank, R>}${'s' | 'o'}`}[Rank]} HandClass
 * @typedef {'LJ' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB'} Position
 * @typedef {Exclude<Position, 'BB'>} OpeningPosition
 * @typedef {'fold' | 'call' | 'check' | 'raise'} LearnAction
 * @typedef {'Open' | 'Limp' | 'Raise' | '3-bet' | '4-bet' | 'Limp-reraise'} OpponentAction
 * @typedef {keyof typeof import('./learn-ranges.json')} RangeKey
 * @typedef {import('./learn-situations.js').SituationKey} SituationKey
 * @typedef {`${SituationKey}-${HandClass}`} ScenarioId
 * @typedef {'correct' | 'close' | 'incorrect'} StrategyGrade
 * @typedef {number} BigBlinds Amount measured in big blinds, not cents.
 * @typedef {number} Percentage Percentage points, from 0 to 100.
 * @typedef {Percentage[]} Frequencies Ordered to match the range's actions.
 * @typedef {{title: string, text: string}} LearnNote
 * @typedef {{actions: LearnAction[], hands: Partial<Record<HandClass, Frequencies>>}} StrategyRange
 * @typedef {StrategyRange & {page: number, chart: number, raiseTo: BigBlinds}} LearnRange
 *
 * @typedef {object} SituationDetails
 * @property {RangeKey} [opponentRangeKey]
 * @property {RangeKey} [previousRangeKey]
 * @property {LearnAction} [opponentRangeAction]
 * @property {LearnAction} [opponentPriorAction]
 * @property {'call' | 'raise'} [lastAction]
 * @property {string} title
 * @property {string} history
 * @property {string} [explanationTitle]
 * @property {BigBlinds} heroBet
 * @property {BigBlinds} currentBet
 * @property {BigBlinds} minRaiseTo
 *
 * @typedef {SituationDetails & ({position: OpeningPosition, opponent?: undefined, opponentAction?: undefined} | {position: Position, opponent: Position, opponentAction?: OpponentAction})} SituationDefinition
 * @typedef {SituationDefinition & {bets: Partial<Record<Position, BigBlinds>>, pot: BigBlinds}} LearnSituation
 *
 * @typedef {object} LearnSeat
 * @property {false} empty
 * @property {false} allIn
 * @property {false} sittingOut
 * @property {false} disconnected
 * @property {{name: string}} player
 * @property {boolean} isCurrentPlayer
 * @property {boolean} isActing
 * @property {boolean} folded
 * @property {LearnAction} [lastAction]
 * @property {Cents} stack
 * @property {Cents} bet
 * @property {(Card | typeof import('./poker/deck.js').HIDDEN)[]} cards
 *
 * @typedef {{seat: number} & ({action: 'fold'} | {action: 'call' | 'raise', amount: Cents})} LearnReplayAction
 * @typedef {{seats: LearnSeat[], action?: LearnReplayAction}} LearnReplayStep
 *
 * @typedef {object} LearnScenario
 * @property {ScenarioId} id
 * @property {Position} position
 * @property {LearnAction[]} actions
 * @property {HandClass} hand
 * @property {string} title
 * @property {string} history
 * @property {Cents} currentBet
 * @property {Cents} minRaiseTo
 * @property {{small: Cents, big: Cents}} blinds
 * @property {LearnSeat[]} seats
 * @property {LearnReplayStep[]} replay Earlier action snapshots, including the initial deal and final action. Empty when already first to act.
 *
 * @typedef {object} LearnSubmission
 * @property {ScenarioId} id
 * @property {Frequencies} frequencies
 * @property {BigBlinds} [raiseTo] Required when the submitted mix includes raising.
 *
 * @typedef {object} OpponentHand
 * @property {Percentage} frequency
 * @property {Percentage} [openingFrequency]
 * @property {number} combinations
 * @property {number} blockedCombinations
 * @property {Percentage} probability
 *
 * @typedef {{hands: Partial<Record<HandClass, OpponentHand>>, totalWeight: number}} ConditionedRange
 * @typedef {ConditionedRange & {page: number, chart: number, position: Position, action: OpponentAction, raiseTo: BigBlinds, openingAction?: 'Limp', notes?: LearnNote[]}} OpponentRange
 * @typedef {{features: {pair: boolean, suited: boolean, highCards: number, straightPatterns: number}, cards: LearnNote[], situation: LearnNote[]}} Playability
 *
 * @typedef {object} LearnEvaluation
 * @property {LearnAction[]} actions
 * @property {Frequencies} expected
 * @property {boolean} distributionMatch
 * @property {StrategyGrade} grade
 * @property {boolean} actionsMatch
 * @property {boolean} frequencyMatch
 * @property {boolean | undefined} sizingMatch
 * @property {BigBlinds} raiseTo
 * @property {Playability} playability
 * @property {string | undefined} explanationTitle
 * @property {string} explanation
 * @property {LearnNote[] | undefined} lessonNotes
 * @property {number} page
 * @property {number} chart
 * @property {StrategyRange['hands']} hands
 * @property {Frequencies} rangeTotals
 * @property {OpponentRange | undefined} opponentRange
 */
export {};
