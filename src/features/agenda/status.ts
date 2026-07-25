import type { CapabilityState, RecordStatus, SyncStatus } from "@/lib/types"

export function syncStatusLabel(status: SyncStatus) {
  const labels: Record<SyncStatus["state"], string> = {
    synced: "已同步",
    syncing: "同步中",
    offline: "离线",
    unconfigured: "未连接",
    error: "同步异常",
  }

  return labels[status.state]
}

export function recordStatusLabel(status: RecordStatus) {
  const labels: Record<RecordStatus, string> = {
    queued: "等待处理",
    "needs-review": "需要你确认",
    ready: "待确认任务",
    archived: "已归档",
    failed: "处理失败",
  }

  return labels[status]
}

export function capabilityStateLabel(state: CapabilityState) {
  const labels: Record<CapabilityState, string> = {
    available: "可用",
    unavailable: "未连接",
    connecting: "连接中",
    error: "服务异常",
  }

  return labels[state]
}
