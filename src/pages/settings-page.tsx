import { useSearchParams } from "react-router"

import { PageError, SettingsLoading } from "@/components/page-state"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AccountSettings } from "@/features/settings/account-settings"
import { CapabilitySettings } from "@/features/settings/capability-settings"
import { MemorySettings } from "@/features/settings/memory-settings"
import { ReminderSettings } from "@/features/settings/reminder-settings"
import { WeeklySettings } from "@/features/settings/weekly-settings"
import { useAgendaSnapshot } from "@/features/agenda/use-agenda"
import { ArchivePage } from "@/pages/archive-page"

const settingTabs = [
  { value: "general", label: "账户与同步" },
  { value: "reminders", label: "提醒" },
  { value: "weekly", label: "周报" },
  { value: "memory", label: "记忆与数据" },
  { value: "capabilities", label: "能力状态" },
  { value: "archive", label: "归档" },
]

export default function SettingsPage() {
  const snapshot = useAgendaSnapshot()
  const [params, setParams] = useSearchParams()
  const requestedTab = params.get("tab")
  const tab = settingTabs.some((item) => item.value === requestedTab)
    ? requestedTab!
    : "general"
  const tabLabel =
    settingTabs.find((item) => item.value === tab)?.label ?? "设置"
  useDocumentTitle(`设置 · ${tabLabel}`)

  if (snapshot.isLoading) return <SettingsLoading />
  if (snapshot.isError)
    return (
      <PageError
        message={snapshot.error.message}
        onRetry={() => snapshot.refetch()}
      />
    )
  if (!snapshot.data) return null

  const setTab = (value: string) => {
    const next = new URLSearchParams(params)
    next.set("tab", value)
    setParams(next, { replace: true })
  }
  const memoryCapability = snapshot.data.capabilities.find(
    (capability) => capability.id === "memory"
  )

  return (
    <div className="py-3 md:p-6">
      <h1 className="sr-only">设置</h1>
      <Tabs
        value={tab}
        onValueChange={setTab}
        className="md:mx-auto md:max-w-5xl"
      >
        <div className="overflow-x-auto border-b px-4 md:px-0">
          <TabsList variant="line" className="min-w-max">
            {settingTabs.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <div className="px-4 pt-6 md:px-0">
          <TabsContent value="general">
            <AccountSettings />
          </TabsContent>
          <TabsContent value="reminders">
            <ReminderSettings
              key={JSON.stringify(snapshot.data.reminderSettings)}
              value={snapshot.data.reminderSettings}
            />
          </TabsContent>
          <TabsContent value="weekly">
            <WeeklySettings
              key={JSON.stringify(snapshot.data.weeklySchedule)}
              value={snapshot.data.weeklySchedule}
            />
          </TabsContent>
          <TabsContent value="memory">
            <MemorySettings
              memories={snapshot.data.memories}
              capability={memoryCapability}
            />
          </TabsContent>
          <TabsContent value="capabilities">
            <CapabilitySettings capabilities={snapshot.data.capabilities} />
          </TabsContent>
          <TabsContent value="archive">
            <ArchivePage embedded />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
