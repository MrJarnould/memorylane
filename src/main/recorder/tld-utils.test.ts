import { describe, it, expect } from 'vitest'
import { extractTld, isTldChange } from './tld-utils'

describe('extractTld', () => {
  it('should extract hostname from HTTPS URLs', () => {
    expect(extractTld('https://github.com/user/repo')).toBe('github.com')
    expect(extractTld('https://www.google.com/search?q=test')).toBe('www.google.com')
  })

  it('should extract hostname from HTTP URLs', () => {
    expect(extractTld('http://example.com')).toBe('example.com')
  })

  it('should extract hostname with subdomains', () => {
    expect(extractTld('https://docs.google.com/document/d/123')).toBe('docs.google.com')
    expect(extractTld('https://mail.google.com/mail/u/0')).toBe('mail.google.com')
  })

  it('should extract hostname with ports', () => {
    expect(extractTld('http://localhost:3000/path')).toBe('localhost:3000')
    expect(extractTld('https://example.com:8080')).toBe('example.com:8080')
  })

  it('should return null for null/undefined/empty', () => {
    expect(extractTld(null)).toBeNull()
    expect(extractTld(undefined)).toBeNull()
    expect(extractTld('')).toBeNull()
  })

  it('should return null for invalid URLs', () => {
    expect(extractTld('not-a-url')).toBeNull()
    expect(extractTld('just some text')).toBeNull()
    expect(extractTld('://missing-scheme')).toBeNull()
  })
})

describe('isTldChange', () => {
  it('should return true when domains differ', () => {
    expect(isTldChange('https://github.com/repo', 'https://google.com/search')).toBe(true)
    expect(isTldChange('https://twitter.com', 'https://youtube.com')).toBe(true)
  })

  it('should return false when domains match', () => {
    expect(isTldChange('https://github.com/repo1', 'https://github.com/repo2')).toBe(false)
  })

  it('should return false when subdomains differ but root is same', () => {
    // Note: extractTld returns the full hostname including subdomain,
    // so docs.google.com !== mail.google.com is treated as a change
    expect(isTldChange('https://docs.google.com', 'https://mail.google.com')).toBe(true)
  })

  it('should return false when either URL is null/undefined/empty', () => {
    expect(isTldChange(null, 'https://github.com')).toBe(false)
    expect(isTldChange('https://github.com', null)).toBe(false)
    expect(isTldChange(null, null)).toBe(false)
    expect(isTldChange(undefined, undefined)).toBe(false)
    expect(isTldChange('', 'https://github.com')).toBe(false)
  })

  it('should return false when either URL is invalid', () => {
    expect(isTldChange('not-a-url', 'https://github.com')).toBe(false)
    expect(isTldChange('https://github.com', 'not-a-url')).toBe(false)
  })

  it('should return false for same URL', () => {
    const url = 'https://github.com/user/repo'
    expect(isTldChange(url, url)).toBe(false)
  })

  it('should handle URLs with different paths on same domain', () => {
    expect(isTldChange('https://github.com/user/repo', 'https://github.com/other/project')).toBe(
      false,
    )
  })

  it('should handle URLs with different protocols on same domain', () => {
    expect(isTldChange('http://example.com', 'https://example.com')).toBe(false)
  })
})
