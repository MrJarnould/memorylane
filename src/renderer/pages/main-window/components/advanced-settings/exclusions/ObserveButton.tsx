import { Radar, Square } from 'lucide-react'
import { Button } from '@components/ui/button'
import type { ObservationState } from '@types'

interface ObserveButtonProps {
  state: ObservationState | null
  onStart: () => void
  onStop: () => void
}

export function ObserveButton({ state, onStart, onStop }: ObserveButtonProps): React.JSX.Element {
  const running = state?.phase === 'running'

  if (running) {
    return (
      <Button variant="destructive" size="sm" onClick={onStop}>
        <Square className="fill-current" />
        Stop
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onStart}
      title="Watch which apps and sites you use for 2 minutes (no screenshots), then add them to exclusions."
    >
      <Radar />
      Auto-fill from activity
    </Button>
  )
}
