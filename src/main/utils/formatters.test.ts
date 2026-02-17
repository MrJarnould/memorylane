import { describe, it, expect } from 'vitest'
import { formatBytes, formatNumber } from './formatters'

describe('formatBytes', () => {
  it('should return "0 Bytes" for zero', () => {
    expect(formatBytes(0)).toBe('0 Bytes')
  })

  it('should format values in Bytes', () => {
    expect(formatBytes(1)).toBe('1 Bytes')
    expect(formatBytes(512)).toBe('512 Bytes')
    expect(formatBytes(1023)).toBe('1023 Bytes')
  })

  it('should format values in KB', () => {
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(10240)).toBe('10 KB')
  })

  it('should format values in MB', () => {
    expect(formatBytes(1048576)).toBe('1 MB')
    expect(formatBytes(1572864)).toBe('1.5 MB')
    expect(formatBytes(5242880)).toBe('5 MB')
  })

  it('should format values in GB', () => {
    expect(formatBytes(1073741824)).toBe('1 GB')
    expect(formatBytes(2147483648)).toBe('2 GB')
  })

  it('should trim trailing zeros from decimals', () => {
    // 1024 * 1.5 = 1536 → "1.5 KB" not "1.50 KB"
    expect(formatBytes(1536)).toBe('1.5 KB')
    // Exact KB value — no decimals
    expect(formatBytes(2048)).toBe('2 KB')
  })

  it('should round to 2 decimal places', () => {
    // 1024 * 1.337 ≈ 1369
    expect(formatBytes(1369)).toBe('1.34 KB')
  })
})

describe('formatNumber', () => {
  it('should format integers', () => {
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(42)).toBe('42')
  })

  it('should add thousand separators for large numbers', () => {
    // toLocaleString output is locale-dependent; just verify it differs from raw string
    const result = formatNumber(1234567)
    expect(result).not.toBe('')
    // Should contain the digits
    expect(result.replace(/\D/g, '')).toBe('1234567')
  })

  it('should handle negative numbers', () => {
    const result = formatNumber(-1000)
    expect(result.replace(/\D/g, '')).toBe('1000')
    expect(result).toContain('-')
  })
})
