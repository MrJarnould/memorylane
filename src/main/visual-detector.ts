import { desktopCapturer } from 'electron';
import { VISUAL_DETECTOR_CONFIG } from '../shared/constants';

// State
let previousImageData: Buffer | null = null;
let detectorIntervalId: NodeJS.Timeout | null = null;
let lastCaptureTime = 0;
let isRunning = false;

// Callback for when significant change is detected
type OnChangeDetectedCallback = (confidence: number) => void;
const changeCallbacks: OnChangeDetectedCallback[] = [];

/**
 * Calculate percentage of pixels that differ between two images
 */
function calculatePixelDifference(buffer1: Buffer, buffer2: Buffer): number {
  if (buffer1.length !== buffer2.length) {
    return 100; // Completely different if sizes don't match
  }

  let differentPixels = 0;
  const totalPixels = buffer1.length / 4; // RGBA format

  // Compare each pixel (RGBA)
  for (let i = 0; i < buffer1.length; i += 4) {
    const r1 = buffer1[i];
    const g1 = buffer1[i + 1];
    const b1 = buffer1[i + 2];

    const r2 = buffer2[i];
    const g2 = buffer2[i + 1];
    const b2 = buffer2[i + 2];

    // Calculate color distance (simple Euclidean)
    const distance = Math.sqrt(
      Math.pow(r2 - r1, 2) + Math.pow(g2 - g1, 2) + Math.pow(b2 - b1, 2)
    );

    // Threshold for considering a pixel "different" (out of 441 max distance)
    if (distance > 30) {
      differentPixels++;
    }
  }

  return (differentPixels / totalPixels) * 100;
}

/**
 * Capture a lightweight sample of the screen for comparison
 */
async function captureSample(): Promise<Buffer> {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: VISUAL_DETECTOR_CONFIG.SAMPLE_WIDTH,
      height: VISUAL_DETECTOR_CONFIG.SAMPLE_HEIGHT,
    },
  });

  if (sources.length === 0) {
    throw new Error('No screen sources available for sampling');
  }

  const primarySource = sources[0];
  const thumbnail = primarySource.thumbnail;

  // Get raw bitmap data for comparison
  return thumbnail.toBitmap();
}

/**
 * Check for visual changes and trigger callbacks if threshold exceeded
 */
async function checkForChanges(): Promise<void> {
  try {
    const currentImageData = await captureSample();

    if (previousImageData) {
      const changePercent = calculatePixelDifference(previousImageData, currentImageData);

      if (changePercent >= VISUAL_DETECTOR_CONFIG.CHANGE_THRESHOLD_PERCENT) {
        console.log(`Visual change detected: ${changePercent.toFixed(2)}% pixels changed`);
        lastCaptureTime = Date.now();

        // Notify all callbacks
        changeCallbacks.forEach((callback) => {
          try {
            callback(changePercent);
          } catch (error) {
            console.error('Error in change detection callback:', error);
          }
        });
      }
    }

    // Store current sample for next comparison
    previousImageData = currentImageData;

    // Check if we should trigger fallback timer
    if (VISUAL_DETECTOR_CONFIG.FALLBACK_TO_TIMER) {
      const timeSinceLastCapture = Date.now() - lastCaptureTime;
      if (timeSinceLastCapture >= VISUAL_DETECTOR_CONFIG.FALLBACK_TIMER_MS) {
        console.log('Fallback timer triggered - no significant changes detected');
        lastCaptureTime = Date.now();

        // Trigger capture via callbacks with 0 confidence
        changeCallbacks.forEach((callback) => {
          try {
            callback(0);
          } catch (error) {
            console.error('Error in fallback timer callback:', error);
          }
        });
      }
    }
  } catch (error) {
    console.error('Error checking for visual changes:', error);
  }
}

/**
 * Start monitoring for visual changes
 */
export function startVisualDetection(): void {
  if (isRunning) {
    console.log('Visual detection already running');
    return;
  }

  if (!VISUAL_DETECTOR_CONFIG.ENABLED) {
    console.log('Visual detection is disabled');
    return;
  }

  console.log('Starting visual change detection');
  isRunning = true;
  lastCaptureTime = Date.now();
  previousImageData = null;

  // Start periodic checking
  detectorIntervalId = setInterval(() => {
    checkForChanges();
  }, VISUAL_DETECTOR_CONFIG.SAMPLE_INTERVAL_MS);

  // Do initial check
  checkForChanges();
}

/**
 * Stop monitoring for visual changes
 */
export function stopVisualDetection(): void {
  if (!isRunning) {
    console.log('Visual detection not running');
    return;
  }

  console.log('Stopping visual change detection');
  isRunning = false;

  if (detectorIntervalId) {
    clearInterval(detectorIntervalId);
    detectorIntervalId = null;
  }

  previousImageData = null;
}

/**
 * Register a callback to be notified when significant changes are detected
 */
export function onChangeDetected(callback: OnChangeDetectedCallback): void {
  changeCallbacks.push(callback);
}

/**
 * Check if visual detection is currently running
 */
export function isDetecting(): boolean {
  return isRunning;
}
