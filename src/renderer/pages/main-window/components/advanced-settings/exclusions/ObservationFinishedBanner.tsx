import { useEffect } from 'react'
import type { ObservationState } from '@types'

const FINISHED_VISIBLE_MS = 5_000

interface ObservationFinishedBannerProps {
  lastRun: NonNullable<ObservationState['lastRun']>
  onDismiss: () => void
}

export function ObservationFinishedBanner({
  lastRun,
  onDismiss,
}: ObservationFinishedBannerProps): React.JSX.Element {
  useEffect(() => {
    const timer = setTimeout(onDismiss, FINISHED_VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const { appsAdded, urlsAdded } = lastRun
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
