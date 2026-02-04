import { app, desktopCapturer } from 'electron';
// eslint-disable-next-line import/no-unresolved
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { Screenshot, OnScreenshotCallback, CaptureReason } from '../../shared/types';
import { VISUAL_DETECTOR_CONFIG } from '../../shared/constants';
import * as visualDetector from './visual-detector';
import * as interactionMonitor from './interaction-monitor';
import * as coordinator from './capture-coordinator';

// Configuration
const SCREENSHOTS_DIR = path.join(app.getPath('userData'), 'screenshots');

// State
let fallbackTimerId: NodeJS.Timeout | null = null;
const screenshotCallbacks: OnScreenshotCallback[] = [];
let isCapturing = false;

// Ensure screenshots directory exists
function ensureScreenshotsDir(): void {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
}

/**
 * Capture a screenshot from the primary display
 */
export async function captureNow(reason?: CaptureReason): Promise<Screenshot> {
  ensureScreenshotsDir();

  // Default reason if not provided
  const captureReason: CaptureReason = reason || {
    type: 'manual',
  };

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: 1920 * 2, // Support high DPI displays
      height: 1080 * 2,
    },
  });

  if (sources.length === 0) {
    throw new Error('No screen sources available for capture');
  }

  // Use the primary display (first source)
  const primarySource = sources[0];
  const thumbnail = primarySource.thumbnail;

  // Generate screenshot metadata
  const id = uuidv4();
  const timestamp = Date.now();
  const filename = `${timestamp}_${id}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);

  // Get actual thumbnail dimensions
  const size = thumbnail.getSize();

  // Save the screenshot
  const pngBuffer = thumbnail.toPNG();
  fs.writeFileSync(filepath, pngBuffer);

  const screenshot: Screenshot = {
    id,
    filepath,
    timestamp,
    display: {
      id: parseInt(primarySource.id.split(':')[1] || '0', 10),
      width: size.width,
      height: size.height,
    },
    trigger: captureReason,
  };

  console.log(`[Capture] Screenshot saved: ${filename} (reason: ${captureReason.type})`);

  // Notify all registered callbacks
  screenshotCallbacks.forEach((callback) => {
    try {
      callback(screenshot);
    } catch (error) {
      console.error('Error in screenshot callback:', error);
    }
  });

  return screenshot;
}

/**
 * Start capturing screenshots using smart detection
 */
export function startCapture(): void {
  if (isCapturing) {
    console.log('[Capture] Already running');
    return;
  }

  console.log('[Capture] Starting screenshot capture with coordinator + visual detection + interaction monitoring');
  isCapturing = true;

  // Setup coordinator callbacks
  coordinator.onCaptureApproved(() => {
    captureNow({ type: 'visual_change' }).catch((error) => {
      console.error('[Capture] Failed to capture screenshot:', error);
    });
  });

  coordinator.onImmediateCheckRequested(() => {
    visualDetector.triggerImmediateCheck();
  });

  // Register visual detector callback
  visualDetector.onChangeDetected(() => {
    console.log('[Capture] Visual change callback received');
    coordinator.registerVisualChange();
  });

  // Register interaction monitor callback
  interactionMonitor.onInteraction((context) => {
    console.log(`[Capture] Interaction callback received: ${context.type}`);
    coordinator.registerInteraction();
  });

  // Start visual detection
  visualDetector.startVisualDetection();

  // Start interaction monitoring
  interactionMonitor.startInteractionMonitoring();

  // Start fallback timer (5 minutes)
  fallbackTimerId = setInterval(() => {
    const timeSinceLastCapture = coordinator.getTimeSinceLastCapture();
    if (timeSinceLastCapture >= VISUAL_DETECTOR_CONFIG.FALLBACK_TIMER_MS) {
      console.log(`[Capture] Fallback timer fired (${(timeSinceLastCapture / 1000).toFixed(0)}s since last capture)`);
      coordinator.registerTimerTrigger();
      captureNow({ type: 'timer' }).catch((error) => {
        console.error('[Capture] Failed to capture screenshot:', error);
      });
    }
  }, VISUAL_DETECTOR_CONFIG.FALLBACK_TIMER_MS);
}

/**
 * Stop capturing screenshots
 */
export function stopCapture(): void {
  if (!isCapturing) {
    console.log('[Capture] Not running');
    return;
  }

  console.log('[Capture] Stopping screenshot capture');
  isCapturing = false;

  // Stop visual detection
  visualDetector.stopVisualDetection();

  // Stop interaction monitoring
  interactionMonitor.stopInteractionMonitoring();

  // Stop fallback timer
  if (fallbackTimerId) {
    clearInterval(fallbackTimerId);
    fallbackTimerId = null;
  }

  // Reset coordinator
  coordinator.reset();
}

/**
 * Register a callback to be notified when screenshots are captured
 */
export function onScreenshot(callback: OnScreenshotCallback): void {
  screenshotCallbacks.push(callback);
}

/**
 * Get the directory where screenshots are saved
 */
export function getScreenshotsDir(): string {
  return SCREENSHOTS_DIR;
}

/**
 * Check if capture is currently running
 */
export function isCapturingNow(): boolean {
  return isCapturing;
}
