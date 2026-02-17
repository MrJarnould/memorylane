import { Activity } from '../../shared/types'
import { OCR_CONFIG } from '@constants'
import log from '../logger'

interface QueueItem {
  readonly activity: Activity
  readonly resolve: () => void
  readonly reject: (err: unknown) => void
}

type ProcessActivityFn = (activity: Activity) => Promise<void>

/**
 * FIFO queue that limits how many activities are processed concurrently.
 * Prevents CPU spikes when many activities complete in quick succession.
 */
export class ProcessingQueue {
  private readonly queue: QueueItem[] = []
  private activeCount = 0
  private readonly maxConcurrent: number
  private readonly processActivity: ProcessActivityFn

  constructor(processActivity: ProcessActivityFn, maxConcurrent?: number) {
    this.processActivity = processActivity
    this.maxConcurrent = maxConcurrent ?? OCR_CONFIG.MAX_CONCURRENT_ACTIVITIES
  }

  public enqueue(activity: Activity): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.queue.push({ activity, resolve, reject })
      log.info(
        `[ProcessingQueue] Enqueued activity ${activity.id} (queue depth: ${this.queue.length}, active: ${this.activeCount})`,
      )
      void this.drain()
    })
  }

  public get depth(): number {
    return this.queue.length
  }

  public get active(): number {
    return this.activeCount
  }

  private async drain(): Promise<void> {
    while (this.activeCount < this.maxConcurrent && this.queue.length > 0) {
      const item = this.queue.shift()!
      this.activeCount++

      log.info(
        `[ProcessingQueue] Processing activity ${item.activity.id} (active: ${this.activeCount}, queued: ${this.queue.length})`,
      )

      try {
        await this.processActivity(item.activity)
        item.resolve()
      } catch (err) {
        item.reject(err)
      } finally {
        this.activeCount--
        log.info(
          `[ProcessingQueue] Finished activity ${item.activity.id} (active: ${this.activeCount}, queued: ${this.queue.length})`,
        )
      }
    }
  }
}
