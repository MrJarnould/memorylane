import { Tabs, TabsList, TabsTab, TabsPanel } from '@components/ui/tabs'
import { AppExclusionList } from './AppExclusionList'
import { WebsiteExclusionList } from './WebsiteExclusionList'

interface ExclusionsManagerProps {
  excludedApps: string[]
  excludedUrlPatterns: string[]
  onAppsChange: (next: string[]) => void
  onUrlsChange: (next: string[]) => void
}

export function ExclusionsManager({
  excludedApps,
  excludedUrlPatterns,
  onAppsChange,
  onUrlsChange,
}: ExclusionsManagerProps): React.JSX.Element {
  return (
    <Tabs defaultValue="apps">
      <TabsList>
        <TabsTab value="apps">Exclude Apps ({excludedApps.length})</TabsTab>
        <TabsTab value="websites">Exclude Websites ({excludedUrlPatterns.length})</TabsTab>
      </TabsList>
      <TabsPanel value="apps" className="pt-2">
        <AppExclusionList excludedApps={excludedApps} onChange={onAppsChange} />
      </TabsPanel>
      <TabsPanel value="websites" className="pt-2">
        <WebsiteExclusionList excludedUrlPatterns={excludedUrlPatterns} onChange={onUrlsChange} />
      </TabsPanel>
    </Tabs>
  )
}
