import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import log from '../logger'
import { normalizeToken, tokenFromBundleId } from '../capture-exclusions'
import type { InstalledApp } from '../../shared/types'

const execFileAsync = promisify(execFile)

let cachedApps: InstalledApp[] | null = null
let cacheLoadPromise: Promise<InstalledApp[]> | null = null

export async function listInstalledApps(): Promise<InstalledApp[]> {
  if (cachedApps) return cachedApps
  if (cacheLoadPromise) return cacheLoadPromise

  cacheLoadPromise = loadForPlatform()
  try {
    cachedApps = await cacheLoadPromise
    return cachedApps
  } finally {
    cacheLoadPromise = null
  }
}

async function loadForPlatform(): Promise<InstalledApp[]> {
  if (process.platform === 'darwin') return loadMacApps()
  if (process.platform === 'win32') return loadWindowsApps()
  return []
}

function dedupeAndSort(apps: InstalledApp[]): InstalledApp[] {
  const byToken = new Map<string, InstalledApp>()
  for (const app of apps) {
    if (!app.matchToken) continue
    if (byToken.has(app.matchToken)) continue
    byToken.set(app.matchToken, app)
  }
  return [...byToken.values()].sort((a, b) =>
    a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }),
  )
}

// ---------------------------------------------------------------------------
// macOS: enumerate .app bundles in standard locations, read CFBundleIdentifier.
// ---------------------------------------------------------------------------

const SEARCH_DIRS_MAC = [
  '/Applications',
  '/Applications/Utilities',
  '/System/Applications',
  '/System/Applications/Utilities',
  path.join(os.homedir(), 'Applications'),
]

async function loadMacApps(): Promise<InstalledApp[]> {
  const bundlePaths = await collectMacAppBundles()
  const resolved = await Promise.all(bundlePaths.map(readMacAppBundle))
  return dedupeAndSort(resolved.filter((app): app is InstalledApp => app !== null))
}

async function collectMacAppBundles(): Promise<string[]> {
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

async function readMacAppBundle(bundlePath: string): Promise<InstalledApp | null> {
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

    return { displayName, matchToken: tokenFromBundleId(bundleId) }
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

function extractPlistString(xml: string, key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`<key>${escaped}</key>\\s*<string>([^<]*)</string>`)
  const match = re.exec(xml)
  return match ? match[1].trim() || null : null
}

// ---------------------------------------------------------------------------
// Windows: enumerate .lnk shortcut filenames under Start Menu. The filename is
// the human-readable display name (e.g. "Google Chrome.lnk"). We don't resolve
// the .lnk binary — normalizeToken on the display name already yields the same
// token the capture-exclusion matcher uses.
// ---------------------------------------------------------------------------

async function loadWindowsApps(): Promise<InstalledApp[]> {
  const roots = collectWindowsStartMenuRoots()
  const all: InstalledApp[] = []
  for (const root of roots) {
    try {
      await collectWindowsShortcuts(root, all, 0)
    } catch {
      // Missing / inaccessible — skip.
    }
  }
  return dedupeAndSort(all.filter((app) => !isWindowsNoise(app.displayName)))
}

function collectWindowsStartMenuRoots(): string[] {
  const roots: string[] = []
  const programData = process.env.ProgramData
  if (programData) {
    roots.push(path.join(programData, 'Microsoft', 'Windows', 'Start Menu', 'Programs'))
  }
  const appData = process.env.APPDATA
  if (appData) {
    roots.push(path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs'))
  }
  return roots
}

async function collectWindowsShortcuts(
  dir: string,
  out: InstalledApp[],
  depth: number,
): Promise<void> {
  if (depth > 3) return
  let entries: import('fs').Dirent[]
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      await collectWindowsShortcuts(path.join(dir, entry.name), out, depth + 1)
      continue
    }
    if (!entry.name.toLowerCase().endsWith('.lnk')) continue
    const displayName = entry.name.slice(0, -4)
    const matchToken = normalizeToken(displayName)
    if (!matchToken) continue
    out.push({ displayName, matchToken })
  }
}

const WINDOWS_NOISE_PATTERNS = ['uninstall', 'readme', 'release notes', 'documentation']

function isWindowsNoise(displayName: string): boolean {
  const lowered = displayName.toLowerCase()
  return WINDOWS_NOISE_PATTERNS.some((p) => lowered.includes(p))
}
