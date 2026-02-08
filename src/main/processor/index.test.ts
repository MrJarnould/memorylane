import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventProcessor } from './index'
import { EmbeddingService } from './embedding'
import { StorageService } from './storage'
import * as fs from 'fs'
import * as ocr from './ocr'

// Mock dependencies
vi.mock('fs')
vi.mock('./ocr')

function makeScreenshot(id: string, filepath = `/tmp/${id}.png`) {
  return {
    id,
    filepath,
    timestamp: Date.now(),
    display: { id: 1, width: 1920, height: 1080 },
    trigger: { type: 'manual' as const },
  }
}

describe('EventProcessor', () => {
  let processor: EventProcessor
  let mockEmbeddingService: EmbeddingService
  let mockStorageService: StorageService

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks()

    // Create manual mocks for services (since they are classes)
    mockEmbeddingService = {
      generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      init: vi.fn(),
    } as unknown as EmbeddingService

    mockStorageService = {
      addEvent: vi.fn().mockResolvedValue(undefined),
      init: vi.fn(),
      getEventById: vi.fn(),
      close: vi.fn(),
    } as unknown as StorageService

    processor = new EventProcessor(mockEmbeddingService, mockStorageService)
  })

  it('should process a screenshot successfully', async () => {
    const screenshot = {
      id: 'test-id',
      filepath: '/tmp/test.png',
      timestamp: 123456,
      display: { id: 1, width: 1920, height: 1080 },
    }

    // Setup mocks behavior
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(ocr.extractText).mockResolvedValue('Detected Text')
    // fs.unlinkSync is void, no return needed

    // Run
    await processor.processScreenshot(screenshot)

    // Verify Pipeline Steps
    // 1. OCR
    expect(ocr.extractText).toHaveBeenCalledWith(screenshot.filepath)

    // 2. Embedding
    expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith('Detected Text')

    // 3. Storage
    expect(mockStorageService.addEvent).toHaveBeenCalledWith({
      appName: '',
      id: screenshot.id,
      timestamp: screenshot.timestamp,
      text: 'Detected Text',
      summary: '',
      vector: [0.1, 0.2, 0.3],
    })

    // 4. Cleanup
    expect(fs.unlinkSync).toHaveBeenCalledWith(screenshot.filepath)
  })

  it('should skip processing if file does not exist', async () => {
    const screenshot = {
      id: 'missing-id',
      filepath: '/tmp/missing.png',
      timestamp: 123456,
      display: { id: 1, width: 100, height: 100 },
    }

    vi.mocked(fs.existsSync).mockReturnValue(false)

    await processor.processScreenshot(screenshot)

    expect(ocr.extractText).not.toHaveBeenCalled()
    expect(mockStorageService.addEvent).not.toHaveBeenCalled()
  })

  describe('processing queue', () => {
    it('should process screenshots sequentially when queued', async () => {
      const executionOrder: string[] = []

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(ocr.extractText).mockImplementation(async (filepath) => {
        const id = filepath.replace('/tmp/', '').replace('.png', '')
        executionOrder.push(`start-${id}`)
        // Simulate async work so ordering is observable
        await new Promise((r) => setTimeout(r, 10))
        executionOrder.push(`end-${id}`)
        return `Text for ${id}`
      })

      const s1 = makeScreenshot('first')
      const s2 = makeScreenshot('second')
      const s3 = makeScreenshot('third')

      // Fire all three concurrently
      await Promise.all([
        processor.processScreenshot(s1),
        processor.processScreenshot(s2),
        processor.processScreenshot(s3),
      ])

      // With maxConcurrentProcessing = 2, the first two should start before the
      // third, and the third should not start until one of the first two finishes.
      expect(executionOrder.indexOf('start-first')).toBeLessThan(
        executionOrder.indexOf('start-third'),
      )
      expect(executionOrder.indexOf('start-second')).toBeLessThan(
        executionOrder.indexOf('start-third'),
      )
      // The third task starts only after at least one of the first two ends
      const thirdStartIdx = executionOrder.indexOf('start-third')
      const firstEndIdx = executionOrder.indexOf('end-first')
      const secondEndIdx = executionOrder.indexOf('end-second')
      expect(Math.min(firstEndIdx, secondEndIdx)).toBeLessThan(thirdStartIdx)
    })

    it('should still resolve all promises even when one task fails', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)

      let callCount = 0
      vi.mocked(ocr.extractText).mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          throw new Error('OCR failed')
        }
        return 'OK'
      })

      const s1 = makeScreenshot('fail')
      const s2 = makeScreenshot('succeed')

      const results = await Promise.allSettled([
        processor.processScreenshot(s1),
        processor.processScreenshot(s2),
      ])

      expect(results[0]?.status).toBe('rejected')
      expect(results[1]?.status).toBe('fulfilled')
    })

    it('should not run more tasks than the concurrency limit at once', async () => {
      let concurrentCount = 0
      let peakConcurrent = 0

      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(ocr.extractText).mockImplementation(async () => {
        concurrentCount++
        peakConcurrent = Math.max(peakConcurrent, concurrentCount)
        await new Promise((r) => setTimeout(r, 20))
        concurrentCount--
        return 'text'
      })

      const screenshots = Array.from({ length: 6 }, (_, i) => makeScreenshot(`task-${i}`))

      await Promise.all(screenshots.map((s) => processor.processScreenshot(s)))

      // maxConcurrentProcessing is 2
      expect(peakConcurrent).toBeLessThanOrEqual(2)
      // Should have processed all 6
      expect(ocr.extractText).toHaveBeenCalledTimes(6)
    })
  })
})
