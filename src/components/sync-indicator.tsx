import { CloudOff, Cloudy, RefreshCw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { syncStatusLabel } from "@/features/agenda/status"
import type { SyncStatus } from "@/lib/types"

export function SyncIndicator({
  status,
  compact = false,
}: {
  status: SyncStatus
  compact?: boolean
}) {
  const Icon =
    status.state === "syncing"
      ? RefreshCw
      : status.state === "synced"
        ? Cloudy
        : CloudOff
  const label = syncStatusLabel(status)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon" : "sm"}
          aria-label={`同步状态：${label}`}
        >
          <Icon
            className={status.state === "syncing" ? "animate-spin" : undefined}
            aria-hidden="true"
          />
          {compact ? <span className="sr-only">{label}</span> : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="flex flex-col gap-2">
          <Badge variant="outline" className="w-fit font-normal">
            <Icon
              className={
                status.state === "syncing" ? "animate-spin" : undefined
              }
              aria-hidden="true"
            />
            {label}
          </Badge>
          <p className="text-sm text-muted-foreground">{status.detail}</p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
