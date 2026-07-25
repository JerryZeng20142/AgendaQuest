import { useEffect } from "react"
import { ArrowLeft, Plus, Settings } from "lucide-react"
import { Outlet, useLocation, useNavigate } from "react-router"

import { useAgendaApi } from "@/api/api-context"
import { useAppUi } from "@/app/app-ui-context"
import { useSession } from "@/auth/session-context"
import { SyncIndicator } from "@/components/sync-indicator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAgendaRealtime, useSyncStatus } from "@/features/agenda/use-agenda"
import { QuickCapture } from "@/features/capture/quick-capture"

const mainTabs = [
  { value: "inbox", path: "/inbox", label: "收集箱" },
  { value: "action", path: "/action", label: "行动台" },
  { value: "weekly", path: "/weekly", label: "简报" },
] as const

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      Boolean(target.closest("input, textarea, select")))
  )
}

export function AppShell() {
  useAgendaRealtime()
  const location = useLocation()
  const navigate = useNavigate()
  const api = useAgendaApi()
  const { session } = useSession()
  const { setQuickCaptureOpen } = useAppUi()
  const sync = useSyncStatus()
  const activeTab =
    mainTabs.find((item) => item.path === location.pathname)?.value ?? ""
  const captureShortcut =
    session?.user.onboardingSettings?.captureShortcut ?? "mod-shift-space"
  const syncStatus = sync.data ?? {
    state: sync.isLoading ? ("syncing" as const) : ("error" as const),
    detail: sync.isError ? "同步状态读取失败。" : "正在读取同步状态。",
  }
  const pageContent = (
    <main
      id="main-content"
      className="min-w-0 overflow-x-hidden pb-[env(safe-area-inset-bottom)] md:pb-0"
      tabIndex={-1}
    >
      <Outlet />
    </main>
  )

  useEffect(() => {
    const openCapture = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return
      const shortcutKey = captureShortcut === "mod-shift-a" ? "KeyA" : "Space"
      if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.code === shortcutKey
      ) {
        event.preventDefault()
        setQuickCaptureOpen(true)
      }
    }
    window.addEventListener("keydown", openCapture)
    return () => window.removeEventListener("keydown", openCapture)
  }, [captureShortcut, setQuickCaptureOpen])

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        const destination = mainTabs.find((item) => item.value === value)
        if (destination) navigate(destination.path)
      }}
      className="min-h-svh gap-0 bg-background"
    >
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-background px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:ring-2 focus:ring-ring"
      >
        跳到主要内容
      </a>
      <header className="sticky top-0 z-20 flex min-h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-3 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-4">
        {activeTab ? (
          <div className="min-w-0 flex-1 overflow-x-auto">
            <TabsList aria-label="主导航" className="min-w-max">
              {mainTabs.map((item) => (
                <TabsTrigger key={item.value} value={item.value}>
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/inbox")}
                >
                  <ArrowLeft aria-hidden="true" />
                  <span className="sr-only">返回收集箱</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>返回收集箱</TooltipContent>
            </Tooltip>
          </div>
        )}
        {api.mode === "preview" ? (
          <Badge variant="secondary" className="hidden sm:inline-flex">
            预览
          </Badge>
        ) : null}
        <SyncIndicator status={syncStatus} compact />
        {activeTab ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/settings")}
              >
                <Settings aria-hidden="true" />
                <span className="sr-only">打开设置</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>设置</TooltipContent>
          </Tooltip>
        ) : null}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              aria-label="随手记录"
              onClick={() => setQuickCaptureOpen(true)}
            >
              <Plus aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>随手记录</TooltipContent>
        </Tooltip>
      </header>
      {activeTab ? (
        <TabsContent value={activeTab} className="min-w-0">
          {pageContent}
        </TabsContent>
      ) : (
        pageContent
      )}
      <QuickCapture />
    </Tabs>
  )
}
