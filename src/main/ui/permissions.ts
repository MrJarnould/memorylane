/**
 * macOS permissions management for Accessibility and Screen Recording
 */

import { systemPreferences, dialog } from 'electron'
import log from '../logger'

/**
 * Ensure all required permissions are granted before starting the app.
 * Checks for Accessibility and Screen Recording permissions.
 * If missing, prompts the user and polls until both are granted.
 */
export const ensurePermissions = async (): Promise<void> => {
  // Non-macOS platforms don't need these permission checks
  if (process.platform !== 'darwin') {
    return
  }

  const checkPermissions = () => {
    const hasAccessibility = systemPreferences.isTrustedAccessibilityClient(false)
    const hasScreenRecording = systemPreferences.getMediaAccessStatus('screen') === 'granted'
    return { hasAccessibility, hasScreenRecording }
  }

  const { hasAccessibility, hasScreenRecording } = checkPermissions()

  // If we have both permissions, we're good to go
  if (hasAccessibility && hasScreenRecording) {
    log.info('[Permissions] All permissions granted')
    return
  }

  // Build message about which permissions are missing
  const missingPermissions: string[] = []
  if (!hasAccessibility) {
    missingPermissions.push('Accessibility')
  }
  if (!hasScreenRecording) {
    missingPermissions.push('Screen Recording')
  }

  log.warn(`[Permissions] Missing permissions: ${missingPermissions.join(', ')}`)

  // Trigger the system prompt for Accessibility (this opens System Settings)
  if (!hasAccessibility) {
    systemPreferences.isTrustedAccessibilityClient(true)
  }

  // Show informational dialog
  await dialog.showMessageBox({
    type: 'info',
    title: 'Permissions Required',
    message: 'MemoryLane needs additional permissions to function properly.',
    detail:
      `Please grant the following permissions in System Settings:\n\n` +
      `${missingPermissions.map((p) => `• ${p}`).join('\n')}\n\n` +
      `System Settings has been opened. Once you grant the permissions, ` +
      `MemoryLane will start automatically.`,
    buttons: ['OK'],
  })

  // Poll every 2 seconds until both permissions are granted
  return new Promise<void>((resolve) => {
    const POLL_INTERVAL_MS = 2000

    const pollId = setInterval(() => {
      const { hasAccessibility: nowAccessibility, hasScreenRecording: nowScreenRecording } =
        checkPermissions()

      if (nowAccessibility && nowScreenRecording) {
        log.info('[Permissions] All permissions granted')
        clearInterval(pollId)
        resolve()
      } else {
        const stillMissing: string[] = []
        if (!nowAccessibility) stillMissing.push('Accessibility')
        if (!nowScreenRecording) stillMissing.push('Screen Recording')
        log.info(`[Permissions] Still waiting for: ${stillMissing.join(', ')}`)
      }
    }, POLL_INTERVAL_MS)
  })
}
