import { Cloud, LogOut, Mail, UserRound } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router"

import { useAgendaApi } from "@/api/api-context"
import { useSession } from "@/auth/session-context"
import { SyncIndicator } from "@/components/sync-indicator"
import { ThemeMenu } from "@/components/theme-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useSyncStatus } from "@/features/agenda/use-agenda"
import { formatDateTime } from "@/lib/format"
import { SettingsSection } from "@/features/settings/settings-section"

export function AccountSettings() {
  const api = useAgendaApi()
  const { session, logout } = useSession()
  const navigate = useNavigate()
  const [logoutPending, setLogoutPending] = useState(false)
  const sync = useSyncStatus()
  const status = sync.data ?? {
    state: sync.isLoading ? ("syncing" as const) : ("error" as const),
    detail: sync.isError ? "同步状态读取失败。" : "正在读取同步状态。",
  }

  const signOut = async () => {
    setLogoutPending(true)
    await logout()
    navigate("/login", { replace: true })
  }

  return (
    <div>
      <SettingsSection title="账户" description="当前登录身份与数据空间。">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar size="lg">
            {session?.user.avatarUrl ? (
              <AvatarImage
                src={session.user.avatarUrl}
                alt=""
                width={40}
                height={40}
              />
            ) : null}
            <AvatarFallback>
              {session?.user.displayName.slice(0, 1)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{session?.user.displayName}</p>
            <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
              <Mail className="size-3.5" aria-hidden="true" />
              {session?.user.email}
            </p>
          </div>
          <Badge variant="outline">
            <UserRound aria-hidden="true" />
            个人空间
          </Badge>
          <Button
            variant="outline"
            onClick={() => void signOut()}
            disabled={logoutPending}
          >
            <LogOut data-icon="inline-start" aria-hidden="true" />
            {logoutPending ? "正在退出…" : "退出登录"}
          </Button>
        </div>
      </SettingsSection>
      <SettingsSection
        title="外观"
        description="选择此设备使用的显示模式与主题色。"
      >
        <ThemeMenu />
      </SettingsSection>
      <SettingsSection
        title="云端同步"
        description="此状态由同步服务返回，不根据本地操作推断。"
      >
        <div className="flex flex-col gap-3 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-medium">
              <Cloud className="size-4" aria-hidden="true" />
              同步状态
            </div>
            <SyncIndicator status={status} />
          </div>
          <p className="text-sm text-muted-foreground">{status.detail}</p>
          <dl className="grid gap-2 text-sm sm:grid-cols-[8rem_1fr]">
            <dt className="text-muted-foreground">数据模式</dt>
            <dd>{api.mode === "cloud" ? "云端" : "本地预览"}</dd>
            <dt className="text-muted-foreground">最后同步</dt>
            <dd>{formatDateTime(status.lastSyncedAt)}</dd>
          </dl>
        </div>
      </SettingsSection>
    </div>
  )
}
