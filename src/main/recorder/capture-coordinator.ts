import { CAPTURE_COORDINATOR_CONFIG } from '../../shared/constants';

// Types
export type TriggerSource = 'visual_change' | 'interaction' | 'timer';

// State
let lastCaptureTime = 0;
let recentInteractionTime = 0;
let interactionBypassUsed = false; // Track if we already bypassed debounce for current interaction

// Callback types
type ShouldCaptureCallback = () => void;
type ImmediateCheckCallback = () => void;

let captureCallback: ShouldCaptureCallback | null = null;
let immediateCheckCallback: ImmediateCheckCallback | null = null;

/**
 * Check if a capture should proceed based on global debounce rules
 *
 * @param trigger - Source of the capture request
 * @returns true if capture should proceed, false if debounced
 */
export function shouldCapture(trigger: TriggerSource): boolean {
  const now = Date.now();
  const timeSinceLastCapture = now - lastCaptureTime;

  // Global debounce check
  if (timeSinceLastCapture < CAPTURE_COORDINATOR_CONFIG.GLOBAL_DEBOUNCE_MS) {
    console.log(`[Coordinator] Debounced: ${(timeSinceLastCapture / 1000).toFixed(1)}s since last capture (need ${CAPTURE_COORDINATOR_CONFIG.GLOBAL_DEBOUNCE_MS / 1000}s)`);

    // Exception: recent interaction + visual change can bypass debounce (once per interaction)
    const timeSinceInteraction = now - recentInteractionTime;
    const hasRecentInteraction = timeSinceInteraction < CAPTURE_COORDINATOR_CONFIG.INTERACTION_SENSITIVITY_WINDOW_MS;

    if (hasRecentInteraction && trigger === 'visual_change' && !interactionBypassUsed) {
      console.log(`[Coordinator] Bypass allowed: visual change within ${(timeSinceInteraction / 1000).toFixed(1)}s of interaction`);
      interactionBypassUsed = true;
      lastCaptureTime = now;
      return true;
    }

    return false;
  }

  // Outside debounce window - allow capture
  lastCaptureTime = now;
  console.log(`[Coordinator] Capture approved from ${trigger}`);
  return true;
}

/**
 * Register that a user interaction occurred
 * This hints the system that the next visual change might be meaningful
 */
export function registerInteraction(): void {
  const now = Date.now();
  recentInteractionTime = now;
  interactionBypassUsed = false; // Reset bypass flag for new interaction

  console.log(`[Coordinator] Interaction registered at ${now}`);

  // Optionally trigger immediate visual check
  if (CAPTURE_COORDINATOR_CONFIG.INTERACTION_TRIGGERS_IMMEDIATE_CHECK && immediateCheckCallback) {
    console.log('[Coordinator] Triggering immediate visual check');
    immediateCheckCallback();
  }
}

/**
 * Register that a visual change was detected
 * Coordinator will decide if capture should proceed
 */
export function registerVisualChange(): void {
  console.log('[Coordinator] Visual change detected, checking if should capture');

  if (shouldCapture('visual_change') && captureCallback) {
    captureCallback();
  }
}

/**
 * Register that the fallback timer fired
 * This bypasses all debouncing (should only fire when system is idle)
 */
export function registerTimerTrigger(): void {
  console.log('[Coordinator] Fallback timer triggered');

  // Reset last capture time to allow timer capture
  const now = Date.now();
  lastCaptureTime = now;

  if (captureCallback) {
    captureCallback();
  }
}

/**
 * Register a callback to execute when capture should proceed
 */
export function onCaptureApproved(callback: ShouldCaptureCallback): void {
  captureCallback = callback;
}

/**
 * Register a callback to trigger immediate visual check
 */
export function onImmediateCheckRequested(callback: ImmediateCheckCallback): void {
  immediateCheckCallback = callback;
}

/**
 * Get time since last capture (for debugging/logging)
 */
export function getTimeSinceLastCapture(): number {
  return Date.now() - lastCaptureTime;
}

/**
 * Reset coordinator state (for testing or restart)
 */
export function reset(): void {
  lastCaptureTime = 0;
  recentInteractionTime = 0;
  interactionBypassUsed = false;
  console.log('[Coordinator] State reset');
}
