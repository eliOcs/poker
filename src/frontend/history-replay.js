import { html } from "lit";
import { ICONS } from "./icons.js";

/** @param {import('./history.js').History} history */
function stopPlaybackTimer(history) {
  clearTimeout(history.replayTimer);
  history.replayTimer = undefined;
}

/** @param {import('./history.js').History} history */
export function stopPlayback(history) {
  stopPlaybackTimer(history);
  history.isPlaying = false;
}

/** @param {import('./history.js').History} history */
export function resetReplay(history) {
  stopPlayback(history);
  history.replayIndex = history.replay.steps.length - 1;
}

/** @param {import('./history.js').History} history */
function scheduleReplayAdvance(history) {
  stopPlaybackTimer(history);
  history.replayTimer = setTimeout(() => {
    advancePlayback(history);
  }, 1000);
}

/** @param {import('./history.js').History} history */
export function advancePlayback(history) {
  const lastIndex = history.replay.steps.length - 1;
  if (!history.isPlaying || history.replayIndex >= lastIndex) {
    stopPlayback(history);
    return;
  }

  history.replayIndex += 1;
  if (history.replayIndex >= lastIndex) {
    stopPlayback(history);
    return;
  }
  scheduleReplayAdvance(history);
}

/** @param {import('./history.js').History} history */
export function togglePlayback(history) {
  if (history.isPlaying) {
    stopPlayback(history);
    return;
  }

  const stepCount = history.replay.steps.length;
  if (history.replayIndex >= stepCount - 1) history.replayIndex = 0;
  history.isPlaying = true;
  scheduleReplayAdvance(history);
}

/**
 * @param {import('./history.js').History} history
 * @param {number} direction
 */
export function stepReplay(history, direction) {
  const lastIndex = history.replay.steps.length - 1;
  stopPlayback(history);
  history.replayIndex = Math.max(
    0,
    Math.min(lastIndex, history.replayIndex + direction),
  );
}

/** @param {import('./history.js').History} history */
export function getCurrentReplayStep(history) {
  return history.replay.steps[history.replayIndex];
}

/**
 * @param {import('./history.js').History} history
 * @param {number} actionNumber
 */
export function getReplayStepIndexForAction(history, actionNumber) {
  return history.replay.steps.findIndex(
    (step) => step.kind === "action" && step.actionNumber === actionNumber,
  );
}

/**
 * @param {import('./history.js').History} history
 * @param {string} street
 */
export function getReplayStepIndexForStreet(history, street) {
  const steps = history.replay.steps;
  const streetStepIndex = steps.findIndex(
    (step) => step.kind === "street" && step.street === street,
  );
  if (streetStepIndex >= 0) return streetStepIndex;
  const actionStepIndex = steps.findIndex(
    (step) => step.kind === "action" && step.street === street,
  );
  if (actionStepIndex >= 0) return actionStepIndex;
  return steps[0].street === street ? 0 : -1;
}

/**
 * @param {import('./history.js').History} history
 * @param {number} stepIndex
 * @param {string} [street]
 */
export function getReplayEntryStatus(history, stepIndex, street) {
  const steps = history.replay.steps;
  const currentStep = steps[history.replayIndex];
  if (street && currentStep.street === street) return "active";
  if (stepIndex < 0) {
    return currentStep.kind === "result" ? "completed" : "future";
  }
  if (stepIndex > history.replayIndex) return "future";
  if (stepIndex < history.replayIndex) return "completed";
  return "active";
}

/** @param {import('./history.js').History} history */
export function renderReplayControls(history) {
  const stepCount = history.replay.steps.length;
  const atStart = history.replayIndex <= 0;
  const atEnd = history.replayIndex >= stepCount - 1;
  const playLabel = history.isPlaying ? "Pause replay" : "Play replay";

  return html`
    <div class="replay-controls" role="group" aria-label="Hand replay">
      <button
        type="button"
        class="button button--compact"
        ?disabled=${atStart}
        @click=${() => {
          stepReplay(history, -1);
        }}
        aria-label="Previous replay step"
        title="Previous replay step"
      >
        <span class="button__icon">${ICONS.previousStep}</span>
      </button>
      <button
        type="button"
        class="button button--primary button--compact"
        @click=${() => {
          togglePlayback(history);
        }}
        aria-label=${playLabel}
        title=${playLabel}
      >
        <span class="button__icon">
          ${history.isPlaying ? ICONS.pause : ICONS.play}
        </span>
      </button>
      <button
        type="button"
        class="button button--compact"
        ?disabled=${atEnd}
        @click=${() => {
          stepReplay(history, 1);
        }}
        aria-label="Next replay step"
        title="Next replay step"
      >
        <span class="button__icon">${ICONS.nextStep}</span>
      </button>
    </div>
  `;
}
