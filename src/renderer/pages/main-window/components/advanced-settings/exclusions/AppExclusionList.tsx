import { useEffect, useMemo, useState } from 'react'
import { Search, Trash2, X } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { ScrollArea } from '@components/ui/scroll-area'
import { Switch } from '@components/ui/switch'
import type { InstalledApp } from '@types'
import { useMainWindowAPI } from '@/renderer/hooks/use-main-window-api'

interface AppExclusionListProps {
  excludedApps: string[]
  onChange: (next: string[]) => void
  recentlyAdded?: string[]
  onDismissRecent?: () => void
}

export function AppExclusionList({
  excludedApps,
  onChange,
  recentlyAdded,
  onDismissRecent,
}: AppExclusionListProps): React.JSX.Element {
  const api = useMainWindowAPI()
  const [apps, setApps] = useState<InstalledApp[] | null>(null)
  const [query, setQuery] = useState('')
  const [manualInput, setManualInput] = useState('')
  const [manualOpen, setManualOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    api
      .listInstalledApps()
      .then((result) => {
        if (cancelled) return
        setApps(result)
      })
      .catch(() => {
        if (cancelled) return
        setApps([])
      })
    return () => {
      cancelled = true
    }
  }, [api])

  const excludedSet = useMemo(
    () => new Set(excludedApps.map((e) => e.toLowerCase())),
    [excludedApps],
  )

  const recentEntries = useMemo(() => {
    if (!recentlyAdded || recentlyAdded.length === 0) return []
    const byToken = new Map<string, string>()
    for (const app of apps ?? []) byToken.set(app.matchToken.toLowerCase(), app.displayName)
    return recentlyAdded.map((token) => {
      const key = token.toLowerCase()
      return { token: key, displayName: byToken.get(key) ?? token }
    })
  }, [recentlyAdded, apps])

  const knownTokens = useMemo(
    () => new Set((apps ?? []).map((a) => a.matchToken.toLowerCase())),
    [apps],
  )

  const legacyEntries = useMemo(
    () => excludedApps.filter((e) => !knownTokens.has(e.toLowerCase())),
    [excludedApps, knownTokens],
  )

  const filteredApps = useMemo(() => {
    if (!apps) return []
    const q = query.trim().toLowerCase()
    if (!q) return apps
    return apps.filter(
      (app) =>
        app.displayName.toLowerCase().includes(q) || app.matchToken.toLowerCase().includes(q),
    )
  }, [apps, query])

  const toggleApp = (token: string, checked: boolean): void => {
    const normalized = token.toLowerCase()
    const next = excludedApps.filter((e) => e.toLowerCase() !== normalized)
    if (checked) next.push(normalized)
    onChange(next)
  }

  const removeLegacy = (entry: string): void => {
    onChange(excludedApps.filter((e) => e.toLowerCase() !== entry.toLowerCase()))
  }

  const addManual = (): void => {
    const value = manualInput.trim().toLowerCase()
    if (!value) return
    if (excludedSet.has(value)) {
      setManualInput('')
      setManualOpen(false)
      return
    }
    onChange([...excludedApps, value])
    setManualInput('')
    setManualOpen(false)
  }

  return (
    <div className="flex flex-col gap-2">
      {recentEntries.length > 0 && (
        <div className="space-y-1 rounded-lg border border-primary/40 bg-primary/5 p-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-medium text-foreground">
              Just added ({recentEntries.length})
            </p>
            {onDismissRecent && (
              <button
                type="button"
                onClick={onDismissRecent}
                className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Dismiss
              </button>
            )}
          </div>
          <ul className="divide-y divide-border/60">
            {recentEntries.map((entry) => {
              const checked = excludedSet.has(entry.token)
              return (
                <li key={entry.token} className="flex items-center gap-2 px-2 py-1.5">
                  <span className="flex-1 truncate text-xs">{entry.displayName}</span>
                  <Switch
                    checked={checked}
                    onCheckedChange={(next) => toggleApp(entry.token, next)}
                    aria-label={`Exclude ${entry.displayName}`}
                  />
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="relative">
        <Search className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (e.target.value.length > 0 && onDismissRecent) onDismissRecent()
          }}
          placeholder="Search applications..."
          className="pl-7 text-xs"
        />
      </div>

      <div className="rounded-lg border border-border">
        {apps === null ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            Loading applications...
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            {query ? 'No applications match your search.' : 'No applications found.'}
          </div>
        ) : (
          <ScrollArea className="h-72">
            <ul className="divide-y divide-border">
              {filteredApps.map((app) => {
                const checked = excludedSet.has(app.matchToken.toLowerCase())
                return (
                  <li key={app.bundleId} className="flex items-center gap-2 px-2 py-1.5">
                    <span className="flex-1 truncate text-xs">{app.displayName}</span>
                    <Switch
                      checked={checked}
                      onCheckedChange={(next) => toggleApp(app.matchToken, next)}
                      aria-label={`Exclude ${app.displayName}`}
                    />
                  </li>
                )
              })}
            </ul>
          </ScrollArea>
        )}
      </div>

      {legacyEntries.length > 0 && (
        <div className="space-y-1 rounded-lg border border-border bg-muted/20 p-2">
          <p className="px-1 text-[11px] font-medium text-muted-foreground">
            Custom entries ({legacyEntries.length})
          </p>
          <ul className="space-y-0.5">
            {legacyEntries.map((entry) => (
              <li
                key={entry}
                className="flex items-center justify-between gap-2 rounded px-1 py-1 hover:bg-muted/40"
              >
                <code className="flex-1 truncate text-[11px]">{entry}</code>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => removeLegacy(entry)}
                  aria-label={`Remove ${entry}`}
                >
                  <Trash2 className="size-3" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <p className="text-[11px] text-muted-foreground">
          Can&apos;t find your app?{' '}
          <button
            type="button"
            className="underline underline-offset-2 hover:text-foreground"
            onClick={() => setManualOpen((v) => !v)}
          >
            Select it manually
          </button>
        </p>
      </div>

      {manualOpen && (
        <div className="flex items-center gap-2 rounded-lg border border-border p-2">
          <Input
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Enter app name or bundle id, e.g. whatsapp"
            className="text-xs"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addManual()
              }
            }}
            autoFocus
          />
          <Button size="xs" variant="outline" onClick={addManual} disabled={!manualInput.trim()}>
            Add
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              setManualInput('')
              setManualOpen(false)
            }}
            aria-label="Cancel"
          >
            <X className="size-3" />
          </Button>
        </div>
      )}
    </div>
  )
}
