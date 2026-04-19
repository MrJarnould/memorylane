import { useEffect, useMemo, useState } from 'react'
import { Globe, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { ScrollArea } from '@components/ui/scroll-area'
import { Switch } from '@components/ui/switch'
import type { SeenDomain } from '@types'
import { useMainWindowAPI } from '@/renderer/hooks/use-main-window-api'

interface WebsiteExclusionListProps {
  excludedUrlPatterns: string[]
  onChange: (next: string[]) => void
  recentlyAdded?: string[]
  onDismissRecent?: () => void
}

function isWildcardPattern(value: string): boolean {
  return value.includes('*') || value.includes('?')
}

const MAX_MATCHES = 20

export function WebsiteExclusionList({
  excludedUrlPatterns,
  onChange,
  recentlyAdded,
  onDismissRecent,
}: WebsiteExclusionListProps): React.JSX.Element {
  const api = useMainWindowAPI()
  const [domains, setDomains] = useState<SeenDomain[] | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    api
      .listSeenDomains()
      .then((result) => {
        if (cancelled) return
        setDomains(result)
      })
      .catch(() => {
        if (cancelled) return
        setDomains([])
      })
    return () => {
      cancelled = true
    }
  }, [api])

  const excludedSet = useMemo(
    () => new Set(excludedUrlPatterns.map((e) => e.toLowerCase())),
    [excludedUrlPatterns],
  )

  const nonLegacyExcluded = useMemo(
    () => excludedUrlPatterns.filter((e) => !isWildcardPattern(e)),
    [excludedUrlPatterns],
  )

  const legacyEntries = useMemo(
    () => excludedUrlPatterns.filter((e) => isWildcardPattern(e)),
    [excludedUrlPatterns],
  )

  const normalizedQuery = query.trim().toLowerCase()

  const matches = useMemo(() => {
    if (!normalizedQuery) return []
    const pool = new Set<string>()
    for (const e of nonLegacyExcluded) {
      const v = e.toLowerCase()
      if (v.includes(normalizedQuery)) pool.add(v)
    }
    for (const d of domains ?? []) {
      const v = d.tld.toLowerCase()
      if (v.includes(normalizedQuery)) pool.add(v)
    }
    return [...pool].slice(0, MAX_MATCHES)
  }, [normalizedQuery, nonLegacyExcluded, domains])

  const canAddCustom = useMemo(() => {
    if (!normalizedQuery) return false
    if (excludedSet.has(normalizedQuery)) return false
    return true
  }, [normalizedQuery, excludedSet])

  const toggleDomain = (tld: string, checked: boolean): void => {
    const normalized = tld.toLowerCase()
    const next = excludedUrlPatterns.filter((e) => e.toLowerCase() !== normalized)
    if (checked) next.push(normalized)
    onChange(next)
  }

  const removeLegacy = (entry: string): void => {
    onChange(excludedUrlPatterns.filter((e) => e.toLowerCase() !== entry.toLowerCase()))
  }

  const addCustom = (): void => {
    if (!canAddCustom) return
    onChange([...excludedUrlPatterns, normalizedQuery])
    setQuery('')
  }

  const recentEntries = (recentlyAdded ?? []).map((e) => e.toLowerCase())

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
              const checked = excludedSet.has(entry)
              return (
                <li key={entry} className="flex items-center gap-2 px-2 py-1.5">
                  <Globe className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-xs">{entry}</span>
                  <Switch
                    checked={checked}
                    onCheckedChange={(next) => toggleDomain(entry, next)}
                    aria-label={`Exclude ${entry}`}
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
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canAddCustom && matches.length === 0) {
              e.preventDefault()
              addCustom()
            }
          }}
          placeholder="Search or type a domain to block (e.g. bank.com)"
          className="pl-7 text-xs"
        />
      </div>

      {normalizedQuery ? (
        <div className="rounded-lg border border-border">
          {matches.length === 0 && !canAddCustom ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              Already blocked.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {matches.map((entry) => {
                const checked = excludedSet.has(entry)
                return (
                  <li key={entry} className="flex items-center gap-2 px-2 py-1.5">
                    <Globe className="size-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate text-xs">{entry}</span>
                    <Switch
                      checked={checked}
                      onCheckedChange={(next) => toggleDomain(entry, next)}
                      aria-label={`Exclude ${entry}`}
                    />
                  </li>
                )
              })}
              {canAddCustom && (
                <li className="flex items-center gap-2 px-2 py-1.5">
                  <Plus className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-xs">
                    Add <code className="font-medium">{normalizedQuery}</code>
                  </span>
                  <Button size="xs" variant="outline" onClick={addCustom}>
                    Add
                  </Button>
                </li>
              )}
            </ul>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          {domains === null ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              Loading websites...
            </div>
          ) : nonLegacyExcluded.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              No websites blocked yet. Type a domain above to block it.
            </div>
          ) : (
            <>
              <p className="px-3 pt-2 text-[11px] font-medium text-muted-foreground">
                Blocked websites ({nonLegacyExcluded.length})
              </p>
              <ScrollArea className="max-h-72">
                <ul className="divide-y divide-border">
                  {nonLegacyExcluded.map((entry) => {
                    const value = entry.toLowerCase()
                    return (
                      <li key={value} className="flex items-center gap-2 px-2 py-1.5">
                        <Globe className="size-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1 truncate text-xs">{value}</span>
                        <Switch
                          checked
                          onCheckedChange={(next) => toggleDomain(value, next)}
                          aria-label={`Exclude ${value}`}
                        />
                      </li>
                    )
                  })}
                </ul>
              </ScrollArea>
            </>
          )}
        </div>
      )}

      {legacyEntries.length > 0 && (
        <div className="space-y-1 rounded-lg border border-border bg-muted/20 p-2">
          <p className="px-1 text-[11px] font-medium text-muted-foreground">
            Custom patterns ({legacyEntries.length})
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
    </div>
  )
}
