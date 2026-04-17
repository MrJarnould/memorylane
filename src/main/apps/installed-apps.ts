import { execFile } from 'child_process'
import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { promisify } from 'util'
import log from '../logger'
import { normalizeToken } from '../capture-exclusions'

const execFileAsync = promisify(execFile)

export interface InstalledApp {
  bundleId: string
  displayName: string
  matchToken: string
  iconDataUrl: string | null
}

const SEARCH_DIRS_MAC = [
  '/Applications',
  '/Applications/Utilities',
  '/System/Applications',
  '/System/Applications/Utilities',
  path.join(os.homedir(), 'Applications'),
]

let cachedApps: InstalledApp[] | null = null
let cacheLoadPromise: Promise<InstalledApp[]> | null = null

export async function listInstalledApps(): Promise<InstalledApp[]> {
  if (process.platform !== 'darwin') return []
  if (cachedApps) return cachedApps
  if (cacheLoadPromise) return cacheLoadPromise

  cacheLoadPromise = loadInstalledApps()
  try {
    cachedApps = await cacheLoadPromise
    return cachedApps
  } finally {
    cacheLoadPromise = null
  }
}

async function loadInstalledApps(): Promise<InstalledApp[]> {
  const bundlePaths = await collectAppBundles()
  const deduped = new Map<string, InstalledApp>()

  await Promise.all(
    bundlePaths.map(async (bundlePath) => {
      const info = await readAppBundle(bundlePath)
      if (!info) return
      const existing = deduped.get(info.bundleId.toLowerCase())
      if (existing) return
      deduped.set(info.bundleId.toLowerCase(), info)
    }),
  )

  return Array.from(deduped.values()).sort((a, b) =>
    a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }),
  )
}

async function collectAppBundles(): Promise<string[]> {
  const results: string[] = []
  for (const dir of SEARCH_DIRS_MAC) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.name.endsWith('.app')) continue
        results.push(path.join(dir, entry.name))
      }
    } catch {
      // Directory missing or not accessible — skip.
    }
  }
  return results
}

async function readAppBundle(bundlePath: string): Promise<InstalledApp | null> {
  try {
    const plistPath = path.join(bundlePath, 'Contents', 'Info.plist')
    const xml = await readPlistAsXml(plistPath)
    if (!xml) return null

    const bundleId = extractPlistString(xml, 'CFBundleIdentifier')
    if (!bundleId) return null

    const displayName =
      extractPlistString(xml, 'CFBundleDisplayName') ??
      extractPlistString(xml, 'CFBundleName') ??
      path.basename(bundlePath, '.app')

    const matchToken = deriveMatchToken(bundleId)

    return {
      bundleId,
      displayName,
      matchToken,
      iconDataUrl: null,
    }
  } catch (error) {
    log.debug(`Failed to read app bundle ${bundlePath}: ${error}`)
    return null
  }
}

async function readPlistAsXml(plistPath: string): Promise<string | null> {
  try {
    const raw = await fs.readFile(plistPath, 'utf8')
    if (raw.startsWith('<?xml')) return raw
  } catch {
    return null
  }

  try {
    const { stdout } = await execFileAsync('/usr/bin/plutil', [
      '-convert',
      'xml1',
      '-o',
      '-',
      plistPath,
    ])
    return stdout
  } catch {
    return null
  }
}

function deriveMatchToken(bundleId: string): string {
  const last = bundleId.split('.').pop() ?? bundleId
  return normalizeToken(last)
}

/**
 * Extracts a <string> value for a given <key> from a plist XML document.
 * Returns null if the key is missing or the plist is binary (not XML).
 */
function extractPlistString(xml: string, key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`<key>${escaped}</key>\\s*<string>([^<]*)</string>`)
  const match = re.exec(xml)
  return match ? match[1].trim() || null : null
}
