# Smart Capture Implementation Plan

## Overview

Add intelligent capture triggering to MemoryLane based on:
1. **Visual change detection** - Significant pixel differences (scrolling, app switching)
2. **User interaction detection** - Mouse clicks, keyboard input
3. **Interaction context capture** - Metadata about what was clicked/typed

This will replace simple time-based capture with activity-driven capture, reducing redundant screenshots while capturing meaningful user actions.

---

## Current State Analysis

### Existing Architecture
- **capture.ts**: Timer-based capture (30s intervals) using `desktopCapturer`
- **Screenshot format**: PNG with metadata (id, filepath, timestamp, display info)
- **Callback system**: `onScreenshot()` for downstream processing
- **Storage**: `{userData}/screenshots/` directory

### Limitations
- No intelligence about screen content or user activity
- Captures redundant screenshots when nothing changes
- Misses important transitions between redundant captures
- No context about what the user was doing

---

## Proposed Architecture

### Three-Part Smart Capture System

#### 1. **Visual Change Detector** (`src/main/visual-detector.ts`)
Monitors screen content for significant changes:
- Periodically captures lightweight screen data (smaller resolution/quality)
- Compares with previous capture using pixel difference algorithm
- Triggers capture when difference exceeds threshold
- Handles multi-display setups

**Key Decisions:**
- **Sampling rate**: Check every 2-5 seconds (configurable)
- **Diff threshold**: e.g., 5-10% of pixels changed
- **Diff algorithm**: Simple pixel comparison vs perceptual hash (pHash)
  - Simple: Fast, detects any change
  - pHash: More sophisticated, resistant to minor variations

#### 2. **Interaction Monitor** (`src/main/interaction-monitor.ts`)
Tracks OS-level user input events:
- Uses `uiohook-napi` for global input monitoring
- Captures mouse clicks, keyboard input, scrolling
- Implements debouncing to avoid excessive captures
- Collects interaction metadata

**Key Decisions:**
- **Debounce period**: 1-3 seconds after interaction
- **Event filtering**: Which events trigger capture?
  - Mouse clicks: YES (most significant)
  - Mouse movement: NO (too frequent)
  - Keyboard: MAYBE (typing sessions, not individual keys)
  - Scrolling: MAYBE (via visual detector is better)

#### 3. **Context Capture System** (`src/main/context-capture.ts`)
Enriches screenshots with interaction context:
- Records click coordinates and timing
- Attempts to identify clicked UI elements (via accessibility APIs)
- Tracks active window/application
- Stores pre-interaction and post-interaction state

**Key Decisions:**
- **Element identification**: Platform-specific challenges
  - macOS: Accessibility API (requires permissions)
  - Windows: UI Automation API
  - Linux: AT-SPI
- **Fallback**: When element ID unavailable, store coordinates + screenshot region

---

## Enhanced Data Model

### Extended Screenshot Interface
```typescript
interface Screenshot {
  // Existing fields
  id: string;
  filepath: string;
  timestamp: number;
  display: DisplayInfo;

  // NEW: Capture trigger information
  trigger: CaptureReason;

  // NEW: Optional interaction context
  interaction?: InteractionContext;
}

interface CaptureReason {
  type: 'timer' | 'visual_change' | 'user_interaction' | 'manual';
  confidence?: number;  // For visual change detection
  metadata?: Record<string, unknown>;
}

interface InteractionContext {
  type: 'click' | 'keyboard' | 'scroll';
  timestamp: number;

  // Click-specific
  clickPosition?: { x: number; y: number };
  clickedElement?: ElementInfo;  // If identifiable

  // Window/app context
  activeWindow?: {
    title: string;
    processName: string;
    bundleId?: string;  // macOS
  };

  // State snapshots
  preInteractionScreenshot?: string;  // filepath
  postInteractionScreenshot?: string; // filepath
}

interface ElementInfo {
  label?: string;        // Button text, link text, etc.
  role?: string;         // button, link, input, etc.
  accessible?: boolean;  // Whether we could read it
  hierarchy?: string[];  // Parent element labels
}
```

---

## Implementation Strategy

### Phase 1: Visual Change Detection (Core Functionality)
**Goal**: Replace dumb timer with smart visual monitoring

**Implementation:**
1. Create `visual-detector.ts` module
2. Implement lightweight screen sampling (reduced resolution)
3. Add simple pixel difference algorithm
4. Integrate with existing capture system
5. Add configuration for thresholds

**Configuration:**
```typescript
// src/shared/constants.ts
export const VISUAL_DETECTOR_CONFIG = {
  ENABLED: true,
  SAMPLE_INTERVAL_MS: 3000,           // Check every 3s
  CHANGE_THRESHOLD_PERCENT: 7.5,      // 7.5% pixels changed
  SAMPLE_WIDTH: 320,                   // Downscale for performance
  SAMPLE_HEIGHT: 180,
  FALLBACK_TO_TIMER: true,            // Capture after N seconds regardless
  FALLBACK_TIMER_MS: 120_000,         // 2 minutes max between captures
};
```

**Testing:**
- Verify detection of app switching
- Verify detection of scrolling
- Verify no false positives during video playback (might need adjustment)
- Performance impact measurement

### Phase 2: User Interaction Detection (Enhanced)
**Goal**: Capture on meaningful user actions

**Implementation:**
1. Add `uiohook-napi` dependency
2. Create `interaction-monitor.ts` module
3. Implement event listeners for clicks
4. Add debouncing logic
5. Integrate with capture system
6. Update Screenshot type with trigger info

**Configuration:**
```typescript
export const INTERACTION_MONITOR_CONFIG = {
  ENABLED: true,
  TRACK_CLICKS: true,
  TRACK_KEYBOARD: false,              // Too noisy initially
  TRACK_SCROLL: false,                // Covered by visual detector
  DEBOUNCE_MS: 2000,                  // 2s between captures
  CAPTURE_DELAY_MS: 500,              // Wait 500ms after click (for UI update)
};
```

**Platform Considerations:**
- Test across macOS, Windows, Linux
- Handle permission requirements (especially macOS accessibility)
- Graceful degradation if uiohook-napi fails to initialize

### Phase 3: Context Enrichment (Advanced)
**Goal**: Capture what the user was doing

**Implementation:**
1. Create `context-capture.ts` module
2. Implement active window detection (Electron APIs)
3. Add platform-specific accessibility API integration
4. Implement pre/post-interaction screenshot pairs
5. Update data model to store context

**Platform-Specific APIs:**
- **macOS**: `NSWorkspace` for active app, Accessibility API for UI elements
- **Windows**: `GetForegroundWindow`, UI Automation
- **Linux**: `xdotool`/`wmctrl`, AT-SPI

**Fallback Strategy:**
When element identification fails:
- Store click coordinates
- Extract small region around click (100x100px)
- Use OCR in future to identify text near click (future enhancement)

**Configuration:**
```typescript
export const CONTEXT_CAPTURE_CONFIG = {
  ENABLED: true,
  CAPTURE_ACTIVE_WINDOW: true,
  CAPTURE_UI_ELEMENTS: true,          // Requires permissions
  CAPTURE_PRE_POST_SNAPSHOTS: false,  // Doubles storage
  REQUEST_PERMISSIONS_ON_START: true,
};
```

---

## Technical Challenges & Solutions

### Challenge 1: Performance Impact
**Problem**: Continuous screen sampling and diff calculations are CPU-intensive

**Solutions:**
- Downsample captured images significantly (320x180 vs 1920x1080)
- Use efficient diff algorithm (consider Web Workers in future)
- Make sampling interval configurable
- Implement adaptive sampling (reduce frequency when no changes detected)

### Challenge 2: Permissions & Privacy
**Problem**: OS-level input monitoring and accessibility APIs require special permissions

**Solutions:**
- Clear permission prompts with explanations
- Graceful degradation without permissions
- Allow disabling specific features
- Document permission requirements per platform

### Challenge 3: Video Playback & Animations
**Problem**: Continuous visual changes during video playback trigger constant captures

**Solutions:**
- Implement "change velocity" detection (sustained high change rate = video)
- Add manual "pause detection" mode
- Consider machine learning to identify video regions (future)
- Allow user to disable visual detection temporarily

### Challenge 4: Cross-Platform Compatibility
**Problem**: Accessibility APIs differ significantly across platforms

**Solutions:**
- Abstract platform-specific code behind common interface
- Implement platform detection and feature availability checks
- Start with macOS (best accessibility API)
- Expand to Windows, then Linux
- Document platform-specific limitations

### Challenge 5: Storage Growth
**Problem**: More captures = more disk space usage

**Solutions:**
- Implement smart deduplication (similar screenshots)
- Add retention policies (delete old screenshots)
- Compress images more aggressively
- Provide storage usage dashboard (future)

---

## Configuration & User Controls

### Tray Menu Additions
```
[ ] Enable Smart Capture
    [x] Visual Change Detection
    [x] Click Detection
    [ ] Keyboard Detection
[ ] Capture Settings...
    - Change threshold: [slider]
    - Check interval: [dropdown]
[ ] Privacy Settings...
    - Request permissions
    - View current permissions
```

### Settings File (`{userData}/settings.json`)
Store user preferences:
```json
{
  "visualDetection": {
    "enabled": true,
    "threshold": 7.5,
    "sampleInterval": 3000
  },
  "interactionMonitoring": {
    "enabled": true,
    "trackClicks": true,
    "trackKeyboard": false
  },
  "contextCapture": {
    "enabled": true,
    "captureWindowInfo": true,
    "captureUIElements": false
  }
}
```

---

## Migration Strategy

### Backward Compatibility
- Keep existing timer-based capture as fallback
- Existing Screenshot interface remains compatible
- New fields are optional additions
- Old screenshots continue to work

### Rollout Approach
1. Deploy Phase 1 (visual detection) with opt-in flag
2. Gather feedback and tune thresholds
3. Add Phase 2 (interactions) as experimental feature
4. Refine based on usage data
5. Add Phase 3 (context) for power users

---

## Testing Strategy

### Unit Tests
- Visual diff algorithm correctness
- Debouncing logic
- Configuration loading/saving
- Event filtering

### Integration Tests
- End-to-end capture flow with visual triggers
- End-to-end capture flow with click triggers
- Permission handling flows
- Multi-display scenarios

### Manual Testing Checklist
- [ ] App switching triggers capture
- [ ] Scrolling triggers capture (above threshold)
- [ ] Video playback doesn't spam captures
- [ ] Click triggers capture with correct delay
- [ ] Inactive periods don't capture
- [ ] Performance impact acceptable (<5% CPU)
- [ ] Memory usage stable over 24h run
- [ ] Works without permissions (degraded mode)

---

## Dependencies to Add

```json
{
  "dependencies": {
    "uiohook-napi": "^1.5.3"  // OS-level input monitoring
  },
  "optionalDependencies": {
    "node-window-manager": "^2.2.4"  // Active window detection
    "@nut-tree/nut-js": "^3.1.0"     // Alternative for screen/window APIs
  }
}
```

---

## Open Questions for User

1. **Capture Frequency Trade-off**:
   - More frequent sampling = better detection but higher CPU usage
   - Preference: Performance or responsiveness?

2. **Keyboard Tracking**:
   - Should typing sessions trigger captures?
   - Privacy concern: Do you want keystroke metadata stored?

3. **Pre/Post-Interaction Snapshots**:
   - Helpful for understanding "before/after" of clicks
   - Doubles storage requirements
   - Worth it?

4. **Video Playback Handling**:
   - Should video playback pause capture automatically?
   - Or require manual intervention?

5. **Permissions Approach**:
   - Request all permissions on first launch?
   - Or request incrementally as features are enabled?

---

## Success Metrics

- **Reduction in redundant captures**: Expect 30-50% fewer screenshots
- **Capture of important moments**: No missed app switches or significant interactions
- **Performance**: <5% CPU impact, <100MB memory overhead
- **User satisfaction**: Positive feedback on relevance of captured screenshots

---

## Future Enhancements (Post-MVP)

- **OCR integration**: Read text from clicked regions
- **ML-based scene detection**: Identify types of content (code editor, browser, etc.)
- **Semantic grouping**: Cluster related screenshots into "sessions"
- **Search & replay**: Find moments by describing what you did
- **Cloud sync**: Sync screenshots and metadata across devices
