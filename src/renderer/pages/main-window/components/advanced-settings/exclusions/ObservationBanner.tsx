import { useEffect } from 'react'
import type { ObservationState } from '@types'

function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const mm = Math.floor(s / 60)
  const ss = s % 60
  return `${mm}:${ss.toString().padStart(2, '0')}`
}

interface ObservationBannerProps {
  state: ObservationState | null
  justFinishedAt: number | null
  onDismissFinished: () => void
}

const FINISHED_VISIBLE_MS = 5_000

export function ObservationBanner({
  state,
  justFinishedAt,
  onDismissFinished,
}: ObservationBannerProps): React.JSX.Element | null {
  useEffect(() => {
    if (!justFinishedAt) return
    const timer = setTimeout(onDismissFinished, FINISHED_VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [justFinishedAt, onDismissFinished])

  const running = state?.phase === 'running'

  if (running && state) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="mt-2 flex items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs"
      >
        <span className="relative inline-flex size-2 shrink-0">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-primary" />
        </span>
        <div className="flex-1 leading-snug">
          <span className="font-medium text-foreground">Observing: </span>
          <span className="text-muted-foreground">
            use the apps and websites you want excluded. They'll be added when the timer ends.
          </span>
        </div>
        <div className="shrink-0 tabular-nums text-muted-foreground">
          {formatCountdown(state.secondsRemaining)} · {state.appsCount} app
          {state.appsCount === 1 ? '' : 's'} · {state.urlsCount} site
          {state.urlsCount === 1 ? '' : 's'}
        </div>
      </div>
    )
  }

  if (justFinishedAt && state?.lastRun) {
    const { appsAdded, urlsAdded } = state.lastRun
    const total = appsAdded + urlsAdded
    return (
      <div
        role="status"
        aria-live="polite"
        className="mt-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs"
      >
        {total === 0 ? (
          <span className="text-muted-foreground">Observation ended. Nothing new detected.</span>
        ) : (
          <>
            <span className="font-medium text-foreground">
              Added {appsAdded} app{appsAdded === 1 ? '' : 's'}, {urlsAdded} site
              {urlsAdded === 1 ? '' : 's'}.
            </span>{' '}
            <span className="text-muted-foreground">
              Review below and toggle off anything you want to keep.
            </span>
          </>
        )}
      </div>
    )
  }

  return null
}
