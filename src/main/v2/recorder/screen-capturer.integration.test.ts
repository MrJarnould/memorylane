import * as fs from 'fs'
import * as path from 'path'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { Frame, ScreenCapturer } from './screen-capturer'

const RUN_INTEGRATION =
  process.platform === 'darwin' && process.env.RUN_NATIVE_SCREENSHOT_INTEGRATION === '1'
const describeIntegration = RUN_INTEGRATION ? describe.sequential : describe.skip

const SCREENSHOT_BINARY_PATH = path.resolve(process.cwd(), 'build', 'swift', 'screenshot')
const OUTPUT_ROOT_DIR = path.resolve(process.cwd(), '.debug-screen-capturer')
const RUN_OUTPUT_DIR = path.join(OUTPUT_ROOT_DIR, new Date().toISOString().replace(/[:.]/g, '-'))

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

let previousExecutableOverride: string | undefined

function assertPng(pathname: string): void {
  expect(fs.existsSync(pathname)).toBe(true)
  const bytes = fs.readFileSync(pathname)
  expect(bytes.length).toBeGreaterThan(PNG_SIGNATURE.length)
  expect(bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)).toBe(true)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describeIntegration('screen capturer integration', () => {
  let capturer: ScreenCapturer | null = null

  beforeAll(() => {
    if (!fs.existsSync(SCREENSHOT_BINARY_PATH)) {
      throw new Error(
        `Missing screenshot binary at ${SCREENSHOT_BINARY_PATH}. Run "npm run build:swift" first.`,
      )
    }

    fs.mkdirSync(RUN_OUTPUT_DIR, { recursive: true })
    previousExecutableOverride = process.env.MEMORYLANE_SCREENSHOT_EXECUTABLE
    process.env.MEMORYLANE_SCREENSHOT_EXECUTABLE = SCREENSHOT_BINARY_PATH
  })

  afterEach(() => {
    if (capturer) {
      capturer.stop()
      capturer = null
    }
  })

  afterAll(() => {
    if (previousExecutableOverride === undefined) {
      delete process.env.MEMORYLANE_SCREENSHOT_EXECUTABLE
    } else {
      process.env.MEMORYLANE_SCREENSHOT_EXECUTABLE = previousExecutableOverride
    }
  })

  it('captures frames at regular intervals', async () => {
    const outputDir = path.join(RUN_OUTPUT_DIR, 'interval-test')
    capturer = new ScreenCapturer({ intervalMs: 500, outputDir })
    const frames: Frame[] = []
    capturer.onFrame((frame) => frames.push(frame))

    capturer.start()
    await sleep(2500)
    capturer.stop()

    expect(frames.length).toBeGreaterThanOrEqual(4)
    expect(frames.length).toBeLessThanOrEqual(6)

    for (const frame of frames) {
      assertPng(frame.filepath)
      expect(frame.width).toBeGreaterThan(0)
      expect(frame.height).toBeGreaterThan(0)
      expect(frame.timestamp).toBeGreaterThan(0)
      expect(frame.displayId).toBeGreaterThan(0)
    }

    // Sequence numbers are monotonically increasing from 0
    for (let i = 0; i < frames.length; i++) {
      expect(frames[i].sequenceNumber).toBe(i)
    }
  }, 10_000)

  it('stop halts capture', async () => {
    const outputDir = path.join(RUN_OUTPUT_DIR, 'stop-test')
    capturer = new ScreenCapturer({ intervalMs: 500, outputDir })
    const frames: Frame[] = []
    capturer.onFrame((frame) => frames.push(frame))

    capturer.start()
    await sleep(1000)
    capturer.stop()
    const countAfterStop = frames.length

    await sleep(1000)
    expect(frames.length).toBe(countAfterStop)
    expect(capturer.capturing).toBe(false)
  }, 10_000)

  it('multiple callbacks receive the same frames', async () => {
    const outputDir = path.join(RUN_OUTPUT_DIR, 'multi-callback-test')
    capturer = new ScreenCapturer({ intervalMs: 500, outputDir })
    const framesA: Frame[] = []
    const framesB: Frame[] = []
    capturer.onFrame((frame) => framesA.push(frame))
    capturer.onFrame((frame) => framesB.push(frame))

    capturer.start()
    await sleep(1200)
    capturer.stop()

    expect(framesA.length).toBeGreaterThanOrEqual(2)
    expect(framesA.length).toBe(framesB.length)

    for (let i = 0; i < framesA.length; i++) {
      expect(framesA[i].filepath).toBe(framesB[i].filepath)
      expect(framesA[i].sequenceNumber).toBe(framesB[i].sequenceNumber)
    }
  }, 10_000)

  it('removeFrameCallback works', async () => {
    const outputDir = path.join(RUN_OUTPUT_DIR, 'remove-callback-test')
    capturer = new ScreenCapturer({ intervalMs: 500, outputDir })
    const frames: Frame[] = []
    const cb = (frame: Frame): void => {
      frames.push(frame)
    }
    capturer.onFrame(cb)
    capturer.removeFrameCallback(cb)

    capturer.start()
    await sleep(800)
    capturer.stop()

    expect(frames.length).toBe(0)
  }, 10_000)

  it('start is idempotent', async () => {
    const outputDir = path.join(RUN_OUTPUT_DIR, 'idempotent-test')
    capturer = new ScreenCapturer({ intervalMs: 500, outputDir })
    const frames: Frame[] = []
    capturer.onFrame((frame) => frames.push(frame))

    capturer.start()
    capturer.start() // second call should be no-op
    await sleep(1200)
    capturer.stop()

    // If start wasn't idempotent, we'd see double the frames
    expect(frames.length).toBeGreaterThanOrEqual(2)
    expect(frames.length).toBeLessThanOrEqual(3)

    // Sequence numbers should still be sequential (no duplicates)
    for (let i = 0; i < frames.length; i++) {
      expect(frames[i].sequenceNumber).toBe(i)
    }
  }, 10_000)

  it('captures first frame immediately', async () => {
    const outputDir = path.join(RUN_OUTPUT_DIR, 'immediate-test')
    capturer = new ScreenCapturer({ intervalMs: 5000, outputDir })
    const frames: Frame[] = []
    capturer.onFrame((frame) => frames.push(frame))

    capturer.start()
    await sleep(500) // well under the 5s interval
    capturer.stop()

    expect(frames.length).toBeGreaterThanOrEqual(1)
    assertPng(frames[0].filepath)
  }, 10_000)

  it('prints where screenshots were saved for manual inspection', () => {
    console.log(`[ScreenCapturerIntegration] Saved captures in: ${RUN_OUTPUT_DIR}`)
  })
})
