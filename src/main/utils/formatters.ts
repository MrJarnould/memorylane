/**
 * Utility formatters for displaying data in the UI
 */

/**
 * Format bytes into human-readable string (Bytes, KB, MB, GB)
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Format number with locale-specific thousand separators
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString()
}
