export const TIMER_INTERVAL = process.env.TIMER_SPEED
  ? Math.floor(1000 / parseInt(process.env.TIMER_SPEED, 10))
  : 1000;

export const RUNOUT_DELAY_TICKS = 2;

export const MUCK_TIMEOUT_TICKS = 5;

export const SHOW_CARDS_TICKS = 5;

/** Bot tables reset every stack to this many big blinds before each hand. */
export const BOT_TABLE_STACK_BIG_BLINDS = 100;
