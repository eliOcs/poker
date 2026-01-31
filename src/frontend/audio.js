let audioContext = null;
let volume = 0.75;

export function getVolume() {
  return volume;
}

export function setVolume(v) {
  volume = v;
}

function getContext() {
  if (audioContext) return audioContext;
  try {
    audioContext = new AudioContext();
    return audioContext;
  } catch (e) {
    console.warn("Web Audio API not supported:", e);
    return null;
  }
}

function playBeep(ctx, frequency, startTime, duration, gain = 0.15) {
  if (volume === 0) return;
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(frequency, startTime);

  gainNode.gain.setValueAtTime(gain * volume, startTime);
  gainNode.gain.setValueAtTime(0, startTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

export function playTurnSound() {
  const ctx = getContext();
  if (!ctx || ctx.state === "suspended") return;

  const now = ctx.currentTime;
  // Two-tone ping: A5 (880Hz) → C6 (1047Hz)
  playBeep(ctx, 880, now, 0.07);
  playBeep(ctx, 1047, now + 0.08, 0.07);
}

export function playClockSound() {
  const ctx = getContext();
  if (!ctx || ctx.state === "suspended") return;

  const now = ctx.currentTime;
  // Three rapid beeps at E6 (1319Hz) for urgency
  playBeep(ctx, 1319, now, 0.08, 0.2);
  playBeep(ctx, 1319, now + 0.12, 0.08, 0.2);
  playBeep(ctx, 1319, now + 0.24, 0.08, 0.2);
}

export function resume() {
  const ctx = getContext();
  if (ctx?.state === "suspended") {
    ctx.resume();
  }
}
