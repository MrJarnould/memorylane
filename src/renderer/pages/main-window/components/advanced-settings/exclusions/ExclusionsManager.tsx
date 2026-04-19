import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Tabs, TabsList, TabsTab, TabsPanel } from '@components/ui/tabs'
import type { ObservationState } from '@types'
import { useMainWindowAPI } from '@/renderer/hooks/use-main-window-api'
import { AppExclusionList } from './AppExclusionList'
import { WebsiteExclusionList } from './WebsiteExclusionList'
import { ObserveButton } from './ObserveButton'
import { ObservationRunningBanner } from './ObservationRunningBanner'
import { ObservationFinishedBanner } from './ObservationFinishedBanner'

const DEFAULT_DURATION_MS = 120_000
const RECENTLY_ADDED_TTL_MS = 30_000

interface ExclusionsManagerProps {
  excludedApps: string[]
  excludedUrlPatterns: string[]
  onAppsChange: (next: string[]) => void
  onUrlsChange: (next: string[]) => void
  onObserved: () => void
}

export function ExclusionsManager({
  excludedApps,
  excludedUrlPatterns,
  onAppsChange,
  onUrlsChange,
  onObserved,
}: ExclusionsManagerProps): React.JSX.Element {
  const api = useMainWindowAPI()
  const [observation, setObservation] = useState<ObservationState | null>(null)
  const [dismissedAt, setDismissedAt] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false
    void api.getObservationState().then((initial) => {
      if (cancelled) return
      setObservation(initial)
    })
    const unsubscribe = api.onObservationUpdate((next) => setObservation(next))
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [api])

  const lastRun = observation?.lastRun
  const showLastRun =
    lastRun !== undefined && lastRun.at > dismissedAt && now - lastRun.at < RECENTLY_ADDED_TTL_MS

  // Single 1 Hz ticker while a lastRun is potentially visible, so the TTL
  // gates above reevaluate and the banner auto-dismisses.
  useEffect(() => {
    if (!lastRun) return
    if (lastRun.at <= dismissedAt) return
    if (Date.now() - lastRun.at >= RECENTLY_ADDED_TTL_MS) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [lastRun, dismissedAt])

  // Notify the page once per run so settings reload.
  const notifiedAtRef = useRef(0)
  useEffect(() => {
    if (!lastRun) return
    if (lastRun.at === notifiedAtRef.current) return
    notifiedAtRef.current = lastRun.at
    onObserved()
  }, [lastRun, onObserved])

  const recentlyAddedApps = showLastRun ? (lastRun?.apps ?? []) : []
  const recentlyAddedUrls = showLastRun ? (lastRun?.urls ?? []) : []

  const handleStart = useCallback((): void => {
    void api.startObservation(DEFAULT_DURATION_MS).then((next) => setObservation(next))
  }, [api])

  const handleStop = useCallback((): void => {
    void api.stopObservation().then((next) => setObservation(next))
  }, [api])

  const dismissRecent = useCallback((): void => {
    setDismissedAt(Date.now())
  }, [])

  const banner = useMemo(() => {
    if (observation?.phase === 'running') {
      return <ObservationRunningBanner state={observation} />
    }
    if (showLastRun && lastRun) {
      return <ObservationFinishedBanner lastRun={lastRun} onDismiss={dismissRecent} />
    }
    return null
  }, [observation, showLastRun, lastRun, dismissRecent])

  const showTip = observation?.phase !== 'running' && !showLastRun

  return (
    <div>
      <Tabs defaultValue="apps">
        <div className="flex items-center justify-between gap-2">
          <TabsList>
            <TabsTab value="apps">Exclude Apps ({excludedApps.length})</TabsTab>
            <TabsTab value="websites">Exclude Websites ({excludedUrlPatterns.length})</TabsTab>
          </TabsList>
          <ObserveButton
            state={observation}
            durationMs={DEFAULT_DURATION_MS}
            onStart={handleStart}
            onStop={handleStop}
          />
        </div>
        {showTip && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Tip: hit <span className="font-medium">Auto-fill from activity</span> and use the apps
            and sites you want blocked, and we&apos;ll add them to the list for you (no screenshots
            taken).
          </p>
        )}
        {banner}
        <TabsPanel value="apps" className="pt-2">
          <AppExclusionList
            excludedApps={excludedApps}
            onChange={onAppsChange}
            recentlyAdded={recentlyAddedApps}
            onDismissRecent={dismissRecent}
          />
        </TabsPanel>
        <TabsPanel value="websites" className="pt-2">
          <WebsiteExclusionList
            excludedUrlPatterns={excludedUrlPatterns}
            onChange={onUrlsChange}
            recentlyAdded={recentlyAddedUrls}
            onDismissRecent={dismissRecent}
          />
        </TabsPanel>
      </Tabs>
    </div>
  )
}
