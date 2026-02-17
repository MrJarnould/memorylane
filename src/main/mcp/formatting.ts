import { ActivitySummary } from '../processor/storage'

/**
 * Formats a single activity as a compact summary line with duration and screenshot count.
 */
export function formatActivityLine(activity: {
  id: string
  startTimestamp: number
  endTimestamp: number
  appName?: string | null
  summary?: string | null
  durationMs?: number | null
  screenshotCount?: number | null
}): string {
  const timeStr = new Date(activity.startTimestamp).toLocaleString()
  const appInfo = activity.appName ? ` [${activity.appName}]` : ''
  const summary = activity.summary || '(no summary)'
  const duration = activity.durationMs ? ` (${formatDuration(activity.durationMs)})` : ''
  const shots = activity.screenshotCount ? `, ${activity.screenshotCount} screenshots` : ''
  return `- ${activity.id} | ${timeStr}${appInfo}${duration}${shots} | ${summary}`
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

/**
 * Unified result type for timeline entries.
 */
export interface TimelineEntry {
  id: string
  timestamp: number
  appName: string
  summary: string
  durationMs?: number
  screenshotCount?: number
}

/**
 * Convert ActivitySummary to TimelineEntry.
 */
export function activityToTimelineEntry(activity: ActivitySummary): TimelineEntry {
  return {
    id: activity.id,
    timestamp: activity.startTimestamp,
    appName: activity.appName ?? '',
    summary: activity.summary ?? '',
    durationMs: activity.durationMs,
    screenshotCount: activity.screenshotCount,
  }
}

/**
 * Format a TimelineEntry as a compact summary line.
 */
export function formatTimelineEntry(entry: TimelineEntry): string {
  const timeStr = new Date(entry.timestamp).toLocaleString()
  const appInfo = entry.appName ? ` [${entry.appName}]` : ''
  const summary = entry.summary || '(no summary)'
  const duration = entry.durationMs ? ` (${formatDuration(entry.durationMs)})` : ''
  const shots = entry.screenshotCount ? `, ${entry.screenshotCount} screenshots` : ''
  return `- ${entry.id} | ${timeStr}${appInfo}${duration}${shots} | ${summary}`
}

/**
 * Samples entries down to the limit using the chosen strategy.
 */
export function sampleEntries<T>(
  entries: T[],
  limit: number,
  sampling: 'uniform' | 'recent_first',
): T[] {
  if (entries.length <= limit) return entries

  if (sampling === 'recent_first') {
    return entries.slice(-limit)
  }

  // Uniform: pick evenly spaced indices across the full range
  const result: T[] = []
  const step = (entries.length - 1) / (limit - 1)
  for (let i = 0; i < limit; i++) {
    const idx = Math.round(i * step)
    if (idx < entries.length) {
      result.push(entries[idx] as T)
    }
  }
  return result
}
