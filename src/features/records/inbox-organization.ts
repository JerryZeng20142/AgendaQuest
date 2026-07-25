import type { AgendaRecord, AgendaTask, RecordKind } from "@/lib/types"

export type InboxFlow = "all" | "flowed" | "unflowed"
export type InboxSort =
  "startedAt" | "dueAt" | "completedAt" | "createdAt" | "updatedAt"
export type InboxGroup = "none" | "flow" | "kind" | "source" | "createdDate"

export const flowOptions: Array<{ value: InboxFlow; label: string }> = [
  { value: "all", label: "全部内容" },
  { value: "flowed", label: "已流转" },
  { value: "unflowed", label: "未流转" },
]

export const sortOptions: Array<{ value: InboxSort; label: string }> = [
  { value: "startedAt", label: "开始时间" },
  { value: "dueAt", label: "截止时间" },
  { value: "completedAt", label: "完成时间" },
  { value: "createdAt", label: "创建时间" },
  { value: "updatedAt", label: "更新时间" },
]

export const groupOptions: Array<{ value: InboxGroup; label: string }> = [
  { value: "none", label: "不分组" },
  { value: "flow", label: "按流转状态" },
  { value: "kind", label: "按内容类型" },
  { value: "source", label: "按来源" },
  { value: "createdDate", label: "按创建日期" },
]

const kindLabels: Record<RecordKind, string> = {
  task: "任务",
  event: "日程",
  idea: "想法",
  reference: "资料",
  unknown: "待分类",
}

export interface InboxRecordItem {
  record: AgendaRecord
  task?: AgendaTask
}

export interface InboxRecordGroup {
  id: string
  label: string
  items: InboxRecordItem[]
}

export function isOptionValue<T extends string>(
  options: Array<{ value: T }>,
  value: string | null
): value is T {
  return options.some((option) => option.value === value)
}

export function matchesFlow(record: AgendaRecord, flow: InboxFlow) {
  if (record.status === "archived") return false
  if (flow === "flowed") return Boolean(record.taskId)
  if (flow === "unflowed") return !record.taskId
  return true
}

function parseTime(value?: string) {
  if (!value) return null
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? null : timestamp
}

function sortTime(item: InboxRecordItem, sort: InboxSort) {
  if (sort === "startedAt") return parseTime(item.task?.startedAt)
  if (sort === "dueAt")
    return parseTime(item.task?.dueAt ?? item.record.analysis.suggestedDueAt)
  if (sort === "completedAt") return parseTime(item.task?.completedAt)
  return parseTime(item.record[sort])
}

export function sortInboxItems(items: InboxRecordItem[], sort: InboxSort) {
  const direction = sort === "dueAt" ? 1 : -1
  return [...items].sort((left, right) => {
    const leftTime = sortTime(left, sort)
    const rightTime = sortTime(right, sort)
    if (leftTime === null && rightTime === null)
      return right.record.createdAt.localeCompare(left.record.createdAt)
    if (leftTime === null) return 1
    if (rightTime === null) return -1
    if (leftTime !== rightTime) return (leftTime - rightTime) * direction
    return right.record.createdAt.localeCompare(left.record.createdAt)
  })
}

function createdDateLabel(createdAt: string) {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return "日期未知"
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date)
}

function groupIdentity(item: InboxRecordItem, group: InboxGroup) {
  if (group === "flow")
    return item.record.taskId
      ? { id: "flowed", label: "已流转" }
      : { id: "unflowed", label: "未流转" }
  if (group === "kind") {
    const kind = item.record.analysis.kind ?? "unknown"
    return { id: kind, label: kindLabels[kind] }
  }
  if (group === "source")
    return { id: item.record.source, label: item.record.source }
  if (group === "createdDate") {
    const label = createdDateLabel(item.record.createdAt)
    return { id: label, label }
  }
  return { id: "all", label: "" }
}

export function groupInboxItems(items: InboxRecordItem[], group: InboxGroup) {
  const groups = new Map<string, InboxRecordGroup>()
  for (const item of items) {
    const identity = groupIdentity(item, group)
    const existing = groups.get(identity.id)
    if (existing) existing.items.push(item)
    else groups.set(identity.id, { ...identity, items: [item] })
  }
  return [...groups.values()]
}
