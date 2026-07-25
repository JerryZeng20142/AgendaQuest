import type { EvidenceState, IsoDateTime, TaskStatus } from "@/lib/types"

const chineseLocale = "zh-CN"

export function formatDateTime(value?: IsoDateTime) {
  if (!value) return "未设定"

  return new Intl.DateTimeFormat(chineseLocale, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value))
}

export function formatRelativeDate(value: IsoDateTime) {
  return new Intl.DateTimeFormat(chineseLocale, {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value))
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatWeekday(value: IsoDateTime) {
  return new Intl.DateTimeFormat(chineseLocale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(value))
}

export function taskStatusLabel(status: TaskStatus) {
  const labels: Record<TaskStatus, string> = {
    pending: "待确认",
    now: "现在执行",
    today: "今日任务",
    upcoming: "即将到期",
    "in-progress": "进行中",
    completed: "已完成",
    archived: "已归档",
  }

  return labels[status]
}

export function evidenceStateLabel(state: EvidenceState) {
  const labels: Record<EvidenceState, string> = {
    full: "完整原文",
    "summary-only": "仅保留摘要",
    "deleted-by-policy": "已按策略删除",
  }

  return labels[state]
}

export function toLocalDateTimeInput(value?: IsoDateTime) {
  if (!value) return ""
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}
