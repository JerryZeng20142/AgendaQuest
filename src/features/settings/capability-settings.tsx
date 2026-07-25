import { Bot, Brain, Camera, MonitorCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { capabilityStateLabel } from "@/features/agenda/status"
import { SettingsSection } from "@/features/settings/settings-section"
import { formatDateTime } from "@/lib/format"
import type { Capability } from "@/lib/types"
import { isScreenCaptureSupported } from "@/platform/screen-capture"

const icons = { memory: Brain, agent: Bot, "screen-analysis": Camera }

export function CapabilitySettings({
  capabilities,
}: {
  capabilities: Capability[]
}) {
  const browserCaptureSupported = isScreenCaptureSupported()

  return (
    <SettingsSection
      title="能力状态"
      description="高级能力状态直接来自服务端；浏览器捕获能力单独检测。"
    >
      <div className="divide-y border-y">
        {capabilities.map((capability) => {
          const Icon = icons[capability.id]
          return (
            <div key={capability.id} className="flex items-start gap-3 py-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <p className="font-medium">{capability.name}</p>
                  <Badge
                    variant={
                      capability.state === "error" ? "destructive" : "outline"
                    }
                  >
                    {capabilityStateLabel(capability.state)}
                  </Badge>
                </div>
                <p className="text-sm break-words text-muted-foreground">
                  {capability.detail}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  状态时间：
                  <time dateTime={capability.updatedAt}>
                    {formatDateTime(capability.updatedAt)}
                  </time>
                </p>
              </div>
            </div>
          )
        })}
        <div className="flex items-start gap-3 py-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
            <MonitorCheck className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <p className="font-medium">浏览器屏幕捕获</p>
              <Badge variant="outline">
                {browserCaptureSupported ? "可请求授权" : "浏览器不支持"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              只有用户主动选择屏幕或窗口后，网页才能取得单帧截图。
            </p>
          </div>
        </div>
      </div>
    </SettingsSection>
  )
}
