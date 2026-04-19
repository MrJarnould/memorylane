import { useCallback, useEffect, useRef, useState } from 'react'
import { Tabs, TabsList, TabsTab, TabsPanel } from '@components/ui/tabs'
import type { ObservationState } from '@types'
import { useMainWindowAPI } from '@/renderer/hooks/use-main-window-api'
import { AppExclusionList } from './AppExclusionList'
import { WebsiteExclusionList } from './WebsiteExclusionList'
import { ObserveButton } from './ObserveButton'
import { ObservationBanner } from './ObservationBanner'

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
  const [recentlyAddedApps, setRecentlyAddedApps] = useState<string[]>([])
  const [recentlyAddedUrls, setRecentlyAddedUrls] = useState<string[]>([])
  const [justFinishedAt, setJustFinishedAt] = useState<number | null>(null)
  const lastRunAtRef = useRef<number | null>(null)
  const recentlyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    void api.getObservationState().then((initial) => {
      if (cancelled) return
      setObservation(initial)
      lastRunAtRef.current = initial.lastRun?.at ?? null
    })
    const unsubscribe = api.onObservationUpdate((next) => {
      setObservation(next)
    })
    return () => {
      cancelled = true
      unsubscribe()
      if (recentlyTimerRef.current) {
        clearTimeout(recentlyTimerRef.current)
        recentlyTimerRef.current = null
      }
    }
  }, [api])

  useEffect(() => {
    if (!observation?.lastRun) return
    const runAt = observation.lastRun.at
    if (runAt === lastRunAtRef.current) return
    lastRunAtRef.current = runAt

    setRecentlyAddedApps(observation.lastRun.apps)
    setRecentlyAddedUrls(observation.lastRun.urls)
    setJustFinishedAt(runAt)
    onObserved()

    if (recentlyTimerRef.current) clearTimeout(recentlyTimerRef.current)
    recentlyTimerRef.current = setTimeout(() => {
      setRecentlyAddedApps([])
      setRecentlyAddedUrls([])
    }, RECENTLY_ADDED_TTL_MS)
  }, [observation, onObserved])

  const handleStart = useCallback((): void => {
    void api.startObservation(DEFAULT_DURATION_MS).then((next) => setObservation(next))
  }, [api])

  const handleStop = useCallback((): void => {
    void api.stopObservation().then((next) => setObservation(next))
  }, [api])

  const dismissFinished = useCallback((): void => {
    setJustFinishedAt(null)
  }, [])

  const dismissRecentApps = useCallback((): void => {
    setRecentlyAddedApps([])
  }, [])

  const dismissRecentUrls = useCallback((): void => {
    setRecentlyAddedUrls([])
  }, [])

  return (
    <div>
      <Tabs defaultValue="apps">
        <div className="flex items-center justify-between gap-2">
          <TabsList>
            <TabsTab value="apps">Exclude Apps ({excludedApps.length})</TabsTab>
            <TabsTab value="websites">Exclude Websites ({excludedUrlPatterns.length})</TabsTab>
          </TabsList>
          <ObserveButton state={observation} onStart={handleStart} onStop={handleStop} />
        </div>
        {observation?.phase !== 'running' && !justFinishedAt && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Tip: hit <span className="font-medium">Auto-fill from activity</span> and use the apps
            and sites you want blocked, and we'll add them to the list for you (no screenshots
            taken).
          </p>
        )}
        <ObservationBanner
          state={observation}
          justFinishedAt={justFinishedAt}
          onDismissFinished={dismissFinished}
        />
        <TabsPanel value="apps" className="pt-2">
          <AppExclusionList
            excludedApps={excludedApps}
            onChange={onAppsChange}
            recentlyAdded={recentlyAddedApps}
            onDismissRecent={dismissRecentApps}
          />
        </TabsPanel>
        <TabsPanel value="websites" className="pt-2">
          <WebsiteExclusionList
            excludedUrlPatterns={excludedUrlPatterns}
            onChange={onUrlsChange}
            recentlyAdded={recentlyAddedUrls}
            onDismissRecent={dismissRecentUrls}
          />
        </TabsPanel>
      </Tabs>
    </div>
  )
}
