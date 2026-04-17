import { useEffect, useMemo, useState } from 'react'
import { Globe, Search, Trash2, X } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { ScrollArea } from '@components/ui/scroll-area'
import { Switch } from '@components/ui/switch'
import type { SeenDomain } from '@types'
import { useMainWindowAPI } from '@/renderer/hooks/use-main-window-api'

interface WebsiteExclusionListProps {
  excludedUrlPatterns: string[]
  onChange: (next: string[]) => void
}

function isWildcardPattern(value: string): boolean {
  return value.includes('*') || value.includes('?')
}

export function WebsiteExclusionList({
  excludedUrlPatterns,
  onChange,
}: WebsiteExclusionListProps): React.JSX.Element {
  const api = useMainWindowAPI()
  const [domains, setDomains] = useState<SeenDomain[] | null>(null)
  const [query, setQuery] = useState('')
  const [manualInput, setManualInput] = useState('')
  const [manualOpen, setManualOpen] = useState(false)

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

  const seenTlds = useMemo(
    () => new Set((domains ?? []).map((d) => d.tld.toLowerCase())),
    [domains],
  )

  const legacyEntries = useMemo(
    () => excludedUrlPatterns.filter((e) => isWildcardPattern(e) || !seenTlds.has(e.toLowerCase())),
    [excludedUrlPatterns, seenTlds],
  )

  const filteredDomains = useMemo(() => {
    if (!domains) return []
    const q = query.trim().toLowerCase()
    if (!q) return domains
    return domains.filter((d) => d.tld.toLowerCase().includes(q))
  }, [domains, query])

  const toggleDomain = (tld: string, checked: boolean): void => {
    const normalized = tld.toLowerCase()
    const next = excludedUrlPatterns.filter((e) => e.toLowerCase() !== normalized)
    if (checked) next.push(normalized)
    onChange(next)
  }

  const removeLegacy = (entry: string): void => {
    onChange(excludedUrlPatterns.filter((e) => e.toLowerCase() !== entry.toLowerCase()))
  }

  const addManual = (): void => {
    const value = manualInput.trim().toLowerCase()
    if (!value) return
    if (excludedSet.has(value)) {
      setManualInput('')
      setManualOpen(false)
      return
    }
    onChange([...excludedUrlPatterns, value])
    setManualInput('')
    setManualOpen(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search websites..."
          className="pl-7 text-xs"
        />
      </div>

      <div className="rounded-lg border border-border">
        {domains === null ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            Loading websites...
          </div>
        ) : filteredDomains.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            {query
              ? 'No websites match your search.'
              : 'No websites seen yet. Start capturing, or add one manually below.'}
          </div>
        ) : (
          <ScrollArea className="h-72">
            <ul className="divide-y divide-border">
              {filteredDomains.map((domain) => {
                const checked = excludedSet.has(domain.tld.toLowerCase())
                return (
                  <li key={domain.tld} className="flex items-center gap-2 px-2 py-1.5">
                    <Globe className="size-5 shrink-0 text-muted-foreground" />
                    <div className="flex flex-1 flex-col overflow-hidden">
                      <span className="truncate text-xs">{domain.tld}</span>
                      <span className="text-[10px] text-muted-foreground">
                        seen {domain.count} {domain.count === 1 ? 'time' : 'times'}
                      </span>
                    </div>
                    <Switch
                      checked={checked}
                      onCheckedChange={(next) => toggleDomain(domain.tld, next)}
                      aria-label={`Exclude ${domain.tld}`}
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

      <div className="flex items-center justify-between gap-2 pt-1">
        <p className="text-[11px] text-muted-foreground">
          Website not in the list?{' '}
          <button
            type="button"
            className="underline underline-offset-2 hover:text-foreground"
            onClick={() => setManualOpen((v) => !v)}
          >
            Add manually
          </button>
        </p>
      </div>

      {manualOpen && (
        <div className="flex items-center gap-2 rounded-lg border border-border p-2">
          <Input
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Enter domain, e.g. bank.com"
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
