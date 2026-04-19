import { useEffect, useState } from 'react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { Textarea } from '@components/ui/textarea'
import type { CaptureSettings } from '@types'
import { formatHotkeyForDisplay, type HotkeyPlatform } from '../../hotkey-utils'
import { SectionToggle } from './SectionToggle'
import { SubSectionToggle } from './SubSectionToggle'
import { SliderRow } from './SliderRow'
import type { NumericCaptureSetting } from './types'
import { formatMs } from './utils'
import { ExclusionsManager } from './exclusions/ExclusionsManager'

interface CapturePrivacySectionProps {
  open: boolean
  onToggle: () => void
  form: CaptureSettings
  hotkeyPlatform: HotkeyPlatform
  recordingHotkey: boolean
  onToggleRecordingHotkey: () => void
  onAutoStartEnabledChange: (enabled: boolean) => void
  onSettingChange: (key: NumericCaptureSetting, value: number) => void
  onSettingCommit: (key: NumericCaptureSetting, value: number) => void
  onExcludePrivateBrowsingChange: (enabled: boolean) => void
  onExcludedRulesCommit: (rules: {
    excludedApps: string[]
    excludedWindowTitlePatterns: string[]
    excludedUrlPatterns: string[]
  }) => void
  onObserved: () => void
  onReset: () => void
}

function parseInputList(input: string): string[] {
  const seen = new Set<string>()
  const parsed: string[] = []

  for (const line of input.split('\n')) {
    const value = line.trim()
    if (value.length === 0) continue
    const dedupeKey = value.toLowerCase()
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    parsed.push(value)
  }

  return parsed
}

export function CapturePrivacySection({
  open,
  onToggle,
  form,
  hotkeyPlatform,
  recordingHotkey,
  onToggleRecordingHotkey,
  onAutoStartEnabledChange,
  onSettingChange,
  onSettingCommit,
  onExcludePrivateBrowsingChange,
  onExcludedRulesCommit,
  onObserved,
  onReset,
}: CapturePrivacySectionProps): React.JSX.Element {
  const [moreOpen, setMoreOpen] = useState(false)

  const excludedWindowTitlePatternsText = form.excludedWindowTitlePatterns.join('\n')
  const [excludedWindowTitleDraft, setExcludedWindowTitleDraft] = useState(
    excludedWindowTitlePatternsText,
  )
  const [windowTitleDirty, setWindowTitleDirty] = useState(false)

  useEffect(() => {
    if (windowTitleDirty) return
    setExcludedWindowTitleDraft(excludedWindowTitlePatternsText)
  }, [excludedWindowTitlePatternsText, windowTitleDirty])

  const commitAppsChange = (nextApps: string[]): void => {
    onExcludedRulesCommit({
      excludedApps: nextApps,
      excludedWindowTitlePatterns: form.excludedWindowTitlePatterns,
      excludedUrlPatterns: form.excludedUrlPatterns,
    })
  }

  const commitUrlsChange = (nextUrls: string[]): void => {
    onExcludedRulesCommit({
      excludedApps: form.excludedApps,
      excludedWindowTitlePatterns: form.excludedWindowTitlePatterns,
      excludedUrlPatterns: nextUrls,
    })
  }

  const commitWindowTitlePatterns = (): void => {
    const parsed = parseInputList(excludedWindowTitleDraft)
    setExcludedWindowTitleDraft(parsed.join('\n'))
    setWindowTitleDirty(false)
    onExcludedRulesCommit({
      excludedApps: form.excludedApps,
      excludedWindowTitlePatterns: parsed,
      excludedUrlPatterns: form.excludedUrlPatterns,
    })
  }

  return (
    <section>
      <SectionToggle label="Capture & Privacy" open={open} onToggle={onToggle} />
      {open && (
        <div className="mt-3 space-y-5">
          {/* Start on login */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-muted-foreground">Start on login</p>
            <div className="grid shrink-0 grid-cols-2 gap-2">
              <Button
                variant={form.autoStartEnabled ? 'default' : 'outline'}
                size="sm"
                onClick={() => onAutoStartEnabledChange(true)}
              >
                On
              </Button>
              <Button
                variant={!form.autoStartEnabled ? 'default' : 'outline'}
                size="sm"
                onClick={() => onAutoStartEnabledChange(false)}
              >
                Off
              </Button>
            </div>
          </div>

          {/* Exclude private browsing */}
          <div className="flex items-center justify-between gap-3">
            <Label className="text-xs text-muted-foreground">Exclude Private Browsing</Label>
            <div
              role="group"
              aria-label="Exclude Private Browsing"
              className="grid shrink-0 grid-cols-2 gap-2"
            >
              <Button
                variant={form.excludePrivateBrowsing ? 'default' : 'outline'}
                size="sm"
                aria-pressed={form.excludePrivateBrowsing}
                onClick={() => onExcludePrivateBrowsingChange(true)}
              >
                On
              </Button>
              <Button
                variant={!form.excludePrivateBrowsing ? 'default' : 'outline'}
                size="sm"
                aria-pressed={!form.excludePrivateBrowsing}
                onClick={() => onExcludePrivateBrowsingChange(false)}
              >
                Off
              </Button>
            </div>
          </div>

          {/* Exclusions manager */}
          <ExclusionsManager
            excludedApps={form.excludedApps}
            excludedUrlPatterns={form.excludedUrlPatterns}
            onAppsChange={commitAppsChange}
            onUrlsChange={commitUrlsChange}
            onObserved={onObserved}
          />

          {/* More sub-section */}
          <div className="pl-2">
            <SubSectionToggle
              label="More"
              open={moreOpen}
              onToggle={() => {
                setMoreOpen((v) => {
                  if (v && recordingHotkey) onToggleRecordingHotkey()
                  return !v
                })
              }}
            />
            {moreOpen && (
              <div className="mt-3 space-y-5">
                {/* Excluded window titles (power-user textarea) */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Excluded Window Titles (one per line)
                  </Label>
                  <Textarea
                    value={excludedWindowTitleDraft}
                    rows={3}
                    className="text-xs resize-y"
                    placeholder={`bank statement\nlab results\npayroll`}
                    onChange={(event) => {
                      setExcludedWindowTitleDraft(event.target.value)
                      setWindowTitleDirty(true)
                    }}
                  />
                  <p className="ml-2 -mt-1 text-[11px] text-muted-foreground">
                    Matching is case-insensitive. <code>*</code> matches any text. <code>?</code>{' '}
                    matches one character.
                  </p>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={commitWindowTitlePatterns}
                      disabled={!windowTitleDirty}
                    >
                      Save window titles
                    </Button>
                  </div>
                </div>

                {/* Visual change sensitivity */}
                <SliderRow
                  label="Visual change sensitivity"
                  value={form.visualThreshold}
                  min={1}
                  max={20}
                  step={1}
                  format={(v) =>
                    `${v}% — ${v <= 5 ? 'more captures' : v >= 15 ? 'fewer captures' : 'balanced'}`
                  }
                  onChange={(v) => onSettingChange('visualThreshold', v)}
                  onCommit={(v) => onSettingCommit('visualThreshold', v)}
                />

                {/* Start/Stop hotkey */}
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-medium text-muted-foreground shrink-0 whitespace-nowrap">
                    Start/Stop Shortcut
                  </Label>
                  <Input
                    value={formatHotkeyForDisplay(form.captureHotkeyAccelerator, hotkeyPlatform)}
                    readOnly
                    className="flex-1 cursor-pointer"
                    onClick={onToggleRecordingHotkey}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Interaction Timeouts</p>
                  <SliderRow
                    label="Typing debounce"
                    value={form.typingDebounceMs}
                    min={500}
                    max={10_000}
                    step={100}
                    format={formatMs}
                    onChange={(v) => onSettingChange('typingDebounceMs', v)}
                    onCommit={(v) => onSettingCommit('typingDebounceMs', v)}
                  />
                  <SliderRow
                    label="Scroll debounce"
                    value={form.scrollDebounceMs}
                    min={200}
                    max={5_000}
                    step={100}
                    format={formatMs}
                    onChange={(v) => onSettingChange('scrollDebounceMs', v)}
                    onCommit={(v) => onSettingCommit('scrollDebounceMs', v)}
                  />
                  <SliderRow
                    label="Click debounce"
                    value={form.clickDebounceMs}
                    min={500}
                    max={10_000}
                    step={100}
                    format={formatMs}
                    onChange={(v) => onSettingChange('clickDebounceMs', v)}
                    onCommit={(v) => onSettingCommit('clickDebounceMs', v)}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Activity Windows</p>
                  <SliderRow
                    label="Minimum activity duration"
                    value={form.minActivityDurationMs}
                    min={1_000}
                    max={30_000}
                    step={1_000}
                    format={formatMs}
                    onChange={(v) => onSettingChange('minActivityDurationMs', v)}
                    onCommit={(v) => onSettingCommit('minActivityDurationMs', v)}
                  />
                  <SliderRow
                    label="Maximum activity duration"
                    value={form.maxActivityDurationMs}
                    min={60_000}
                    max={1_800_000}
                    step={60_000}
                    format={formatMs}
                    onChange={(v) => onSettingChange('maxActivityDurationMs', v)}
                    onCommit={(v) => onSettingCommit('maxActivityDurationMs', v)}
                  />
                  <SliderRow
                    label="Max screenshots for LLM"
                    value={form.maxScreenshotsForLlm}
                    min={1}
                    max={20}
                    step={1}
                    format={(v) => `${v}`}
                    onChange={(v) => onSettingChange('maxScreenshotsForLlm', v)}
                    onCommit={(v) => onSettingCommit('maxScreenshotsForLlm', v)}
                  />
                </div>

                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={onReset}>
                    Reset to defaults
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
