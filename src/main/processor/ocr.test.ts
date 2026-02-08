import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'events'

vi.mock('electron', () => ({
  app: { isPackaged: false },
}))

let spawnMock: ReturnType<typeof vi.fn<(...args: unknown[]) => MockChildProcess>>
let lastSpawnedProcess: MockChildProcess

class MockChildProcess extends EventEmitter {
  readonly stdout = new EventEmitter()
  readonly stderr = new EventEmitter()
  kill = vi.fn()
}

vi.mock('child_process', () => ({
  spawn: (...args: unknown[]) => spawnMock(...args),
}))

vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
}))

import * as fs from 'fs'
import { extractText } from './ocr'

describe('OCR extractText', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    lastSpawnedProcess = new MockChildProcess()
    spawnMock = vi.fn().mockReturnValue(lastSpawnedProcess)
    vi.mocked(fs.existsSync).mockReturnValue(true)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should spawn swift with the script path and image path', async () => {
    const promise = extractText('/tmp/image.png')

    lastSpawnedProcess.stdout.emit('data', Buffer.from('text'))
    lastSpawnedProcess.emit('close', 0)
    await promise

    expect(spawnMock).toHaveBeenCalledOnce()
    const [command, args] = spawnMock.mock.calls[0]
    expect(command).toBe('swift')
    expect(args[0]).toMatch(/ocr\.swift$/)
    expect(args[1]).toBe('/tmp/image.png')
  })

  it('should concatenate and trim stdout chunks', async () => {
    const promise = extractText('/tmp/image.png')

    lastSpawnedProcess.stdout.emit('data', Buffer.from('  Hello '))
    lastSpawnedProcess.stdout.emit('data', Buffer.from('World  \n'))
    lastSpawnedProcess.emit('close', 0)

    await expect(promise).resolves.toBe('Hello World')
  })

  it('should resolve with empty string when no text is recognized', async () => {
    const promise = extractText('/tmp/image.png')

    lastSpawnedProcess.emit('close', 0)

    await expect(promise).resolves.toBe('')
  })

  it('should reject when the image file does not exist', async () => {
    vi.mocked(fs.existsSync)
      .mockReturnValueOnce(true) // script path check in getOcrScriptPath
      .mockReturnValueOnce(false) // image file check in extractText

    await expect(extractText('/tmp/missing.png')).rejects.toThrow(
      'Image file not found: /tmp/missing.png',
    )
    expect(spawnMock).not.toHaveBeenCalled()
  })

  it('should reject with concatenated stderr when process exits with non-zero code', async () => {
    const promise = extractText('/tmp/image.png')

    lastSpawnedProcess.stderr.emit('data', Buffer.from('Vision '))
    lastSpawnedProcess.stderr.emit('data', Buffer.from('framework error'))
    lastSpawnedProcess.emit('close', 1)

    await expect(promise).rejects.toThrow('OCR process failed with code 1: Vision framework error')
  })

  it('should reject when the swift process fails to spawn', async () => {
    const promise = extractText('/tmp/image.png')

    lastSpawnedProcess.emit('error', new Error('ENOENT'))

    await expect(promise).rejects.toThrow('Failed to spawn swift process: ENOENT')
  })

  it('should kill the process and reject after the timeout', async () => {
    const promise = extractText('/tmp/image.png')

    vi.advanceTimersByTime(30_000)

    await expect(promise).rejects.toThrow('OCR process timed out after 30000ms')
    expect(lastSpawnedProcess.kill).toHaveBeenCalledWith('SIGKILL')
  })

  it('should settle only once when close fires after a timeout', async () => {
    const promise = extractText('/tmp/image.png')

    vi.advanceTimersByTime(30_000)

    // Late stdout data and close with success code — should be ignored
    lastSpawnedProcess.stdout.emit('data', Buffer.from('late data'))
    lastSpawnedProcess.emit('close', 0)

    await expect(promise).rejects.toThrow('OCR process timed out')
  })

  it('should not kill the process when it completes before the timeout', async () => {
    const promise = extractText('/tmp/image.png')

    lastSpawnedProcess.stdout.emit('data', Buffer.from('text'))
    lastSpawnedProcess.emit('close', 0)

    await expect(promise).resolves.toBe('text')

    vi.advanceTimersByTime(30_000)
    expect(lastSpawnedProcess.kill).not.toHaveBeenCalled()
  })
})
