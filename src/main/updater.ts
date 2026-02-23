import { app, Notification } from 'electron'
import { autoUpdater } from 'electron-updater'
import log from './logger'

export type UpdateState = 'idle' | 'downloading' | 'ready'
let state: UpdateState = 'idle'
let reminderInterval: ReturnType<typeof setInterval> | null = null
// Must be kept in module scope so the click handler isn't garbage-collected.
let currentNotification: Notification | null = null

export const getUpdateState = (): UpdateState => state

export const quitAndInstall = (): void => {
  if (reminderInterval) {
    clearInterval(reminderInterval)
    reminderInterval = null
  }
  // isForceRunAfter=true is required for tray apps that have no main window,
  // otherwise the quit sequence can stall.
  autoUpdater.quitAndInstall(false, true)
}

const showUpdateNotification = (version: string): void => {
  if (currentNotification) currentNotification.close()
  currentNotification = new Notification({
    title: 'MemoryLane Update Ready',
    body: `Version ${version} is ready. Click to restart and update.`,
    silent: true,
  })
  currentNotification.on('click', () => quitAndInstall())
  currentNotification.show()
}

export const initAutoUpdater = (onUpdateStateChange: () => void): void => {
  if (!app.isPackaged) {
    log.info('[Updater] Skipping in dev mode')
    return
  }

  autoUpdater.logger = log
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    log.info(`[Updater] Update available: ${info.version}`)
    state = 'downloading'
    onUpdateStateChange()
  })

  autoUpdater.on('update-downloaded', (info) => {
    log.info(`[Updater] Update downloaded: ${info.version}`)
    state = 'ready'
    onUpdateStateChange()

    showUpdateNotification(info.version)

    if (reminderInterval) clearInterval(reminderInterval)
    reminderInterval = setInterval(() => showUpdateNotification(info.version), 4 * 60 * 60 * 1000)
  })

  autoUpdater.on('update-not-available', () => {
    state = 'idle'
    log.info('[Updater] Up to date.')
  })

  autoUpdater.on('error', (err) => {
    log.error('[Updater] Error:', err)
  })

  setTimeout(() => void autoUpdater.checkForUpdates(), 10_000)
  setInterval(() => void autoUpdater.checkForUpdates(), 4 * 60 * 60 * 1000)
}
