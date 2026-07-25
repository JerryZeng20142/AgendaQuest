import { useEffect } from "react"
import { ArrowLeft, Plus, Settings } from "lucide-react"
import { Outlet, useLocation, useNavigate } from "react-router"

import { useAgendaApi } from "@/api/api-context"
import { useAppUi } from "@/app/app-ui-context"
import { useSession } from "@/auth/session-context"
import { SyncIndicator } from "@/components/sync-indicator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAgendaRealtime, useSyncStatus } from "@/features/agenda/use-agenda"
import { QuickCapture } from "@/features/capture/quick-capture"

const mainPages = ["/inbox", "/action"] as const
const subPageTitle: Record<string, string> = {
  "/settings": "设置",
  "/weekly": "周报",
  "/archive": "归档",
}

function isMainPagePath(pathname: string): boolean {
  return mainPages.includes(pathname as any)
}

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
  const isMain = isMainPagePath(location.pathname)
  const captureShortcut =
    session?.user.onboardingSettings?.captureShortcut ?? "mod-shift-space"
  const syncStatus = sync.data ?? {
    state: sync.isLoading ? ("syncing" as const) : ("error" as const),
    detail: sync.isError ? "同步状态读取失败。" : "正在读取同步状态。",
  }

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
    <div className="app-frame">
      <div className="workspace">
        <a href="#main-content" className="skip-link">
          跳到主要内容
        </a>

        {isMain ? (
          /* ---- Main pages: show topbar + page content ---- */
          <Tabs
            value={location.pathname}
            onValueChange={(path) => navigate(path)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <header className="app-topbar">
              <span className="app-username">
                {session?.user.displayName || "我"}
              </span>
              <TabsList aria-label="主页面" className="app-surface-tabs">
                <TabsTrigger value="/inbox">收集</TabsTrigger>
                <TabsTrigger value="/action">行动</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-1">
                {api.mode === "preview" && (
                  <Badge variant="secondary" className="hidden sm:inline-flex">
                    预览
                  </Badge>
                )}
                <SyncIndicator status={syncStatus} compact />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="打开设置"
                      onClick={() => navigate("/settings")}
                    >
                      <Settings aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>设置</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon-sm"
                      aria-label="随手记录"
                      onClick={() => setQuickCaptureOpen(true)}
                    >
                      <Plus aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>随手记录</TooltipContent>
                </Tooltip>
              </div>
            </header>
            <main id="main-content" className="app-body" tabIndex={-1}>
              <Outlet />
            </main>
          </Tabs>
        ) : (
          /* ---- Sub pages: show back button + title ---- */
          <>
            <header className="app-topbar">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="返回"
                    onClick={() => navigate("/inbox")}
                  >
                    <ArrowLeft aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>返回</TooltipContent>
              </Tooltip>
              <h1 className="header-title">
                {subPageTitle[location.pathname] ?? "Agenda Quest"}
              </h1>
              <span className="header-spacer" />
            </header>
            <main id="main-content" className="app-body" tabIndex={-1}>
              <Outlet />
            </main>
          </>
        )}

        <QuickCapture />
      </div>
    </div>
  )
}
