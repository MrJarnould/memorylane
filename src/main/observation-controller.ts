import { addAppWatcherListener, AppWatcherEvent } from './recorder/app-watcher'
import { normalizeToken } from './capture-exclusions'
import { extractTld } from './recorder/tld-utils'
import { NON_WEBSITE_HOSTS } from '../shared/app-utils'
import type { ObservationState } from '../shared/types'
import log from './logger'

interface CaptureSuppressor {
  setFrameCaptureSuppressed(suppressed: boolean): void | Promise<void>
}

const DEFAULT_DURATION_MS = 120_000
const MIN_DURATION_MS = 5_000
const MAX_DURATION_MS = 30 * 60_000

const SELF_BUNDLE_ID_FRAGMENTS = ['memorylane']

export interface ObservationController {
  start(durationMs: number): ObservationState
  stop(reason: 'user' | 'timer'): ObservationState
  getState(): ObservationState
}

interface ControllerParams {
  captureControl: CaptureSuppressor
  onUpdate: (state: ObservationState) => void
  onSettingsPatch: (patch: { apps: string[]; urls: string[] }) => void
}

function tokenForApp(event: AppWatcherEvent): string | null {
  if (event.bundleId) {
    const parts = event.bundleId.split('.')
    const last = parts[parts.length - 1]
    if (last) {
      const token = normalizeToken(last)
      if (token) return token
    }
  }
  if (event.app) {
    const token = normalizeToken(event.app)
    if (token) return token
  }
  return null
}

function isSelf(event: AppWatcherEvent): boolean {
  const bundleId = event.bundleId?.toLowerCase() ?? ''
  const app = event.app?.toLowerCase() ?? ''
  return SELF_BUNDLE_ID_FRAGMENTS.some((frag) => bundleId.includes(frag) || app.includes(frag))
}

export function createObservationController(params: ControllerParams): ObservationController {
  let phase: 'idle' | 'running' = 'idle'
  let durationMs = DEFAULT_DURATION_MS
  let startedAt = 0
  let endsAt = 0
  let apps = new Set<string>()
  let urls = new Set<string>()
  let unsubscribe: (() => void) | null = null
  let tickInterval: NodeJS.Timeout | null = null
  let endTimer: NodeJS.Timeout | null = null
  let lastRun: ObservationState['lastRun'] | undefined

  const getState = (): ObservationState => {
    const secondsRemaining =
      phase === 'running' ? Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)) : 0
    return {
      phase,
      durationMs,
      secondsRemaining,
      appsCount: apps.size,
      urlsCount: urls.size,
      lastRun,
    }
  }

  const emit = (): void => {
    try {
      params.onUpdate(getState())
    } catch (error) {
      log.warn('[Observation] onUpdate listener threw:', error)
    }
  }

  const handleEvent = (event: AppWatcherEvent): void => {
    if (event.type !== 'app_change' && event.type !== 'window_change') return
    if (isSelf(event)) return

    let changed = false

    const appToken = tokenForApp(event)
    if (appToken && !apps.has(appToken)) {
      apps.add(appToken)
      changed = true
    }

    const host = extractTld(event.url)
    if (host) {
      const normalized = host.toLowerCase()
      if (!NON_WEBSITE_HOSTS.has(normalized) && !urls.has(normalized)) {
        urls.add(normalized)
        changed = true
      }
    }

    if (changed) emit()
  }

  const clearTimers = (): void => {
    if (tickInterval) {
      clearInterval(tickInterval)
      tickInterval = null
    }
    if (endTimer) {
      clearTimeout(endTimer)
      endTimer = null
    }
  }

  const stop = (reason: 'user' | 'timer'): ObservationState => {
    if (phase !== 'running') return getState()

    clearTimers()
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }

    void params.captureControl.setFrameCaptureSuppressed(false)

    const collectedApps = [...apps]
    const collectedUrls = [...urls]
    const appsAdded = collectedApps.length
    const urlsAdded = collectedUrls.length

    try {
      params.onSettingsPatch({ apps: collectedApps, urls: collectedUrls })
    } catch (error) {
      log.error('[Observation] onSettingsPatch threw:', error)
    }

    phase = 'idle'
    lastRun = {
      appsAdded,
      urlsAdded,
      apps: collectedApps,
      urls: collectedUrls,
      at: Date.now(),
    }
    log.info(`[Observation] Stopped (reason=${reason}, apps=${appsAdded}, urls=${urlsAdded})`)
    emit()
    return getState()
  }

  const start = (requestedDurationMs: number): ObservationState => {
    if (phase === 'running') return getState()

    const clamped = Math.max(
      MIN_DURATION_MS,
      Math.min(
        MAX_DURATION_MS,
        Number.isFinite(requestedDurationMs) && requestedDurationMs > 0
          ? Math.floor(requestedDurationMs)
          : DEFAULT_DURATION_MS,
      ),
    )

    durationMs = clamped
    apps = new Set<string>()
    urls = new Set<string>()
    startedAt = Date.now()
    endsAt = startedAt + clamped
    phase = 'running'

    try {
      unsubscribe = addAppWatcherListener(handleEvent)
    } catch (error) {
      log.error('[Observation] Failed to subscribe to app-watcher:', error)
      phase = 'idle'
      throw error
    }

    void params.captureControl.setFrameCaptureSuppressed(true)

    tickInterval = setInterval(emit, 1000)
    endTimer = setTimeout(() => {
      stop('timer')
    }, clamped)

    log.info(`[Observation] Started (durationMs=${clamped})`)
    emit()
    return getState()
  }

  return {
    start,
    stop,
    getState,
  }
}
