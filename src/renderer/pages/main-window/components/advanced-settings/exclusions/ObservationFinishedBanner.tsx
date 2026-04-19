import type { ObservationState } from '@types'

interface ObservationFinishedBannerProps {
  lastRun: NonNullable<ObservationState['lastRun']>
}

export function ObservationFinishedBanner({
  lastRun,
}: ObservationFinishedBannerProps): React.JSX.Element {
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
