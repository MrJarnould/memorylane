import * as path from 'path'
import log from '../../logger'
import { SCREEN_CAPTURER_CONFIG } from '@constants'
import { captureDesktop } from './native-screenshot'

export interface ScreenCapturerConfig {
  intervalMs?: number
  outputDir: string
  displayId?: number
}

export interface Frame {
  filepath: string
  timestamp: number
  width: number
  height: number
  displayId: number
  sequenceNumber: number
}

export type OnFrameCallback = (frame: Frame) => void

export class ScreenCapturer {
  private readonly intervalMs: number
  private readonly outputDir: string
  private readonly displayId: number | undefined
  private readonly callbacks: OnFrameCallback[] = []
  private _capturing = false
  private timer: ReturnType<typeof setTimeout> | null = null
  private _sequenceNumber = 0

  constructor(config: ScreenCapturerConfig) {
    this.intervalMs = config.intervalMs ?? SCREEN_CAPTURER_CONFIG.DEFAULT_INTERVAL_MS
    this.outputDir = config.outputDir
    this.displayId = config.displayId
  }

  get capturing(): boolean {
    return this._capturing
  }

  start(): void {
    if (this._capturing) return
    this._capturing = true
    this.tick()
  }

  stop(): void {
    this._capturing = false
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  onFrame(cb: OnFrameCallback): void {
    this.callbacks.push(cb)
  }

  removeFrameCallback(cb: OnFrameCallback): void {
    const idx = this.callbacks.indexOf(cb)
    if (idx !== -1) {
      this.callbacks.splice(idx, 1)
    }
  }

  private tick(): void {
    if (!this._capturing) return

    const start = Date.now()
    this.captureFrame()
      .then(() => {
        if (!this._capturing) return
        const elapsed = Date.now() - start
        const delay = Math.max(0, this.intervalMs - elapsed)
        this.timer = setTimeout(() => this.tick(), delay)
      })
      .catch((err) => {
        log.error('[ScreenCapturer] Capture failed:', err)
        if (!this._capturing) return
        const elapsed = Date.now() - start
        const delay = Math.max(0, this.intervalMs - elapsed)
        this.timer = setTimeout(() => this.tick(), delay)
      })
  }

  private async captureFrame(): Promise<void> {
    const seq = this._sequenceNumber++
    const outputPath = path.join(this.outputDir, `frame-${seq}.png`)
    const timestamp = Date.now()

    const result = await captureDesktop({
      outputPath,
      displayId: this.displayId,
    })

    const frame: Frame = {
      filepath: result.filepath,
      timestamp,
      width: result.width,
      height: result.height,
      displayId: result.displayId,
      sequenceNumber: seq,
    }

    this.emitFrame(frame)
  }

  private emitFrame(frame: Frame): void {
    for (const cb of this.callbacks) {
      try {
        cb(frame)
      } catch (err) {
        log.error('[ScreenCapturer] Callback error:', err)
      }
    }
  }
}
