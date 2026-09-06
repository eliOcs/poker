export const TIMER_INTERVAL = process.env.TIMER_SPEED
  ? Math.floor(1000 / parseInt(process.env.TIMER_SPEED, 10))
  : 1000;

export const RUNOUT_DELAY_TICKS = 2;

export const MUCK_TIMEOUT_TICKS = 5;

export const SHOW_CARDS_TICKS = 5;
