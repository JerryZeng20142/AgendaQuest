import { useMemo, useState } from "react"
import {
  Archive,
  ArrowRight,
  ArrowUpDown,
  Bot,
  ChevronDown,
  ChevronRight,
  Clock3,
  Download,
  Layers3,
  ListFilter,
  MoreHorizontal,
  Paperclip,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react"
import { Link, useSearchParams } from "react-router"
import { toast } from "sonner"

import { useAgendaApi } from "@/api/api-context"
import { PageEmpty, PageError, PageLoading } from "@/components/page-state"
import { useDocumentTitle } from "@/hooks/use-document-title"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  useAgendaActions,
  useAgendaSnapshot,
} from "@/features/agenda/use-agenda"
import { recordStatusLabel } from "@/features/agenda/status"
import {
  flowOptions,
  groupInboxItems,
  groupOptions,
  isOptionValue,
  matchesFlow,
  sortInboxItems,
  sortOptions,
  type InboxFlow,
  type InboxGroup,
  type InboxSort,
} from "@/features/records/inbox-organization"
import { TaskConfirmDialog } from "@/features/records/task-confirm-dialog"
import {
  evidenceStateLabel,
  formatDateTime,
  formatFileSize,
} from "@/lib/format"
import type { AgendaRecord, RecordAttachment } from "@/lib/types"

/**
 * Compact record row. Default view shows AI analysis, source, date, status.
 * Expand to see full raw content, topics, processing trace, and attachments.
 * All actions are in the "more" menu.
 */
function RecordRow({
  record,
  onConvert,
  onDelete,
}: {
  record: AgendaRecord
  onConvert(record: AgendaRecord): void
  onDelete(record: AgendaRecord): void
}) {
  const api = useAgendaApi()
  const { archiveRecord, getAttachmentDownload, requestRecordAnalysis } =
    useAgendaActions()
  const [open, setOpen] = useState(false)

  const archive = async () => {
    try {
      await archiveRecord.mutateAsync(record.id)
      toast.success("记录已归档，可在设置中查看。")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作未能完成。")
    }
  }

  const downloadAttachment = async (attachment: RecordAttachment) => {
    try {
      const download = await getAttachmentDownload.mutateAsync({
        recordId: record.id,
        attachmentId: attachment.id,
      })
      const link = document.createElement("a")
      link.href = download.url
      link.target = "_blank"
      link.rel = "noopener noreferrer"
      link.click()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "附件下载失败。")
    }
  }

  const retryAnalysis = async () => {
    try {
      await requestRecordAnalysis.mutateAsync(record.id)
      toast.success("已重新提交分析，原始记录保持不变。")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "分析未能重新提交。")
    }
  }

  // Compute display label — show AI summary title unconditionally in collapsed state
  const summaryTitle =
    record.analysis.title?.trim()
    ?? (record.rawContent
      ? (record.rawContent.length > 120 ? record.rawContent.slice(0, 120) + "…" : record.rawContent)
      : "原始内容已按保留策略删除。")

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="group/collapsible"
    >
      <div className="task-feed-item">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {/* AI summary — always visible */}
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="task-feed-main"
                aria-expanded={open}
              >
                <span className="flex items-start gap-2 text-left font-medium text-foreground break-words">
                  <span className="mt-0.5 shrink-0 text-muted-foreground">
                    {open ? (
                      <ChevronDown className="size-4" aria-hidden="true" />
                    ) : (
                      <ChevronRight className="size-4" aria-hidden="true" />
                    )}
                  </span>
                  <span>{summaryTitle}</span>
                </span>
              </button>
            </CollapsibleTrigger>
            {/* Source + date */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{record.source}</span>
              <span aria-hidden="true">·</span>
              <time dateTime={record.createdAt}>
                {formatDateTime(record.createdAt)}
              </time>
              {record.attachments.length ? (
                <span className="inline-flex items-center gap-1">
                  <Paperclip className="size-3" aria-hidden="true" />
                  {record.attachments.length}
                </span>
              ) : null}
              {record.analysis.kind ? (
                <Badge variant="outline" className="text-[10px]">
                  {record.analysis.kind}
                </Badge>
              ) : null}
            </div>
          </div>
          <Badge
            variant={
              record.status === "failed"
                ? "destructive"
                : record.status === "ready" || record.status === "needs-review"
                  ? "default"
                  : "outline"
            }
            className="shrink-0"
          >
            {recordStatusLabel(record.status)}
          </Badge>
        </div>

        {/* Expandable details */}
        <CollapsibleContent className="pt-3">
          <Separator className="mb-3" />
          {record.analysis.status === "complete" ? (
            <dl className="grid gap-x-4 gap-y-2 text-sm md:grid-cols-[5rem_1fr]">
              <dt className="text-muted-foreground">原始原文</dt>
              <dd className="min-w-0 break-words">
                {record.rawContent ?? "已按保留策略删除。"}
              </dd>
              <dt className="text-muted-foreground">提取标题</dt>
              <dd className="min-w-0 break-words">
                {record.analysis.title ?? "未生成"}
              </dd>
              <dt className="text-muted-foreground">下一步行动</dt>
              <dd className="min-w-0 break-words">
                {record.analysis.nextAction ?? "未生成"}
              </dd>
              <dt className="text-muted-foreground">建议截止</dt>
              <dd>{formatDateTime(record.analysis.suggestedDueAt)}</dd>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              {record.analysis.failureReason ??
                (record.analysis.status === "queued"
                  ? "原始记录已保存，等待后台处理。"
                  : "当前没有可显示的分析结果。")}
            </p>
          )}
          {record.analysis.topics.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {record.analysis.topics.map((topic) => (
                <Badge key={topic} variant="outline">
                  #{topic}
                </Badge>
              ))}
            </div>
          ) : null}

          {/* Processing trace */}
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-normal text-muted-foreground">
              查看处理追踪
            </summary>
            <dl className="mt-2 grid gap-2 text-xs md:grid-cols-[6rem_1fr]">
              <dt className="text-muted-foreground">原文保存时间</dt>
              <dd>
                <time dateTime={record.persistedAt}>
                  {formatDateTime(record.persistedAt)}
                </time>
              </dd>
              <dt className="text-muted-foreground">证据保留状态</dt>
              <dd>{evidenceStateLabel(record.evidenceState)}</dd>
              <dt className="text-muted-foreground">当前分析运行</dt>
              <dd className="font-mono break-all" translate="no">
                {record.analysis.runId ?? "未启动"}
              </dd>
              <dt className="text-muted-foreground">运行记录数</dt>
              <dd className="tabular-nums">
                {record.analysisHistory.length}
              </dd>
              <dt className="text-muted-foreground">关联任务</dt>
              <dd className="font-mono break-all" translate="no">
                {record.taskId ?? "尚未生成"}
              </dd>
            </dl>
          </details>

          {/* Attachments */}
          {record.attachments.length ? (
            <div className="mt-3 border-t pt-3">
              <h4 className="mb-2 text-xs font-medium">原始附件</h4>
              <ul className="flex flex-col gap-2">
                {record.attachments.map((attachment) => (
                  <li
                    key={attachment.id}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{attachment.name}</p>
                      <p className="text-muted-foreground">
                        {attachment.mediaType} ·{" "}
                        {formatFileSize(attachment.size)} ·{" "}
                        {formatDateTime(attachment.createdAt)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => void downloadAttachment(attachment)}
                      disabled={
                        api.mode !== "cloud" ||
                        getAttachmentDownload.isPending
                      }
                      aria-label={`下载附件：${attachment.name}`}
                    >
                      <Download aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CollapsibleContent>

        {/* Actions bar */}
        <div className="task-feed-actions">
          {!record.taskId ? (
            <Button size="sm" onClick={() => onConvert(record)}>
              <ArrowRight data-icon="inline-start" aria-hidden="true" />
              转为任务
            </Button>
          ) : (
            <Button size="sm" variant="outline" asChild>
              <Link to={`/action?task=${encodeURIComponent(record.taskId)}`}>
                <Bot data-icon="inline-start" aria-hidden="true" />
                查看任务
              </Link>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="更多操作">
                <MoreHorizontal aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!record.taskId &&
              api.mode === "cloud" &&
              ["failed", "unavailable"].includes(record.analysis.status) ? (
                <DropdownMenuItem
                  onClick={() => void retryAnalysis()}
                  disabled={requestRecordAnalysis.isPending}
                >
                  <Sparkles />
                  重新分析
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onClick={archive}>
                <Archive />
                仅归档保存
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(record)}
              >
                <Trash2 />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Collapsible>
  )
}

export default function InboxPage() {
  useDocumentTitle("收集")
  const snapshot = useAgendaSnapshot()
  const { deleteRecord } = useAgendaActions()
  const [params, setParams] = useSearchParams()
  const [taskRecord, setTaskRecord] = useState<AgendaRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AgendaRecord | null>(null)
  const requestedFlow = params.get("flow")
  const requestedSort = params.get("sort")
  const requestedGroup = params.get("group")
  const flow: InboxFlow = isOptionValue(flowOptions, requestedFlow)
    ? requestedFlow
    : "all"
  const sort: InboxSort = isOptionValue(sortOptions, requestedSort)
    ? requestedSort
    : "createdAt"
  const group: InboxGroup = isOptionValue(groupOptions, requestedGroup)
    ? requestedGroup
    : "none"
  const query = params.get("q") ?? ""
  const focusId = params.get("record")

  const recordGroups = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("zh-CN")
    const tasksById = new Map(
      (snapshot.data?.tasks ?? []).map((task) => [task.id, task])
    )
    const items = (snapshot.data?.records ?? [])
      .filter((record) => {
        if (focusId)
          return record.id === focusId && record.status !== "archived"
        if (!matchesFlow(record, flow)) return false
        if (!normalized) return true
        const haystack = [
          record.rawContent,
          record.retainedSummary,
          record.analysis.title,
          record.analysis.nextAction,
          ...record.analysis.topics,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("zh-CN")
        return haystack.includes(normalized)
      })
      .map((record) => ({
        record,
        task: record.taskId ? tasksById.get(record.taskId) : undefined,
      }))
    return groupInboxItems(sortInboxItems(items, sort), group)
  }, [
    snapshot.data?.records,
    snapshot.data?.tasks,
    flow,
    sort,
    group,
    query,
    focusId,
  ])

  const recordCount = recordGroups.reduce(
    (count, recordGroup) => count + recordGroup.items.length,
    0
  )

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (key === "flow") next.delete("view")
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteRecord.mutateAsync(deleteTarget.id)
      toast.success("记录及其关联数据已永久删除。")
      setDeleteTarget(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "记录删除失败。")
    }
  }

  if (snapshot.isLoading) return <PageLoading />
  if (snapshot.isError)
    return (
      <PageError
        message={snapshot.error.message}
        onRetry={() => snapshot.refetch()}
      />
    )

  return (
    <div className="flex h-full flex-col py-3 md:p-6">
      <h1 className="sr-only">收集</h1>
      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 px-4 md:mx-auto md:max-w-5xl md:px-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={flow}
              onValueChange={(value) =>
                updateParam("flow", value === "all" ? "" : value)
              }
            >
              <SelectTrigger aria-label="筛选流转状态" className="min-w-[7rem]">
                <ListFilter className="text-muted-foreground" aria-hidden="true" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  {flowOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select
              value={sort}
              onValueChange={(value) =>
                updateParam("sort", value === "createdAt" ? "" : value)
              }
            >
              <SelectTrigger aria-label="排序方式" className="min-w-[7rem]">
                <ArrowUpDown className="text-muted-foreground" aria-hidden="true" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select
              value={group}
              onValueChange={(value) =>
                updateParam("group", value === "none" ? "" : value)
              }
            >
              <SelectTrigger aria-label="分组方式" className="min-w-[7rem]">
                <Layers3 className="text-muted-foreground" aria-hidden="true" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  {groupOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <InputGroup className="w-full sm:max-w-xs">
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              name="record-search"
              value={query}
              onChange={(event) => updateParam("q", event.target.value)}
              placeholder="搜索原文、话题或任务"
              aria-label="搜索"
              autoComplete="off"
            />
          </InputGroup>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock3 className="size-3.5" aria-hidden="true" />
          <span>先保存原文，再启动分析</span>
        </div>
      </div>
      {/* Record list */}
      {recordCount ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col md:mx-auto md:max-w-5xl">
            {recordGroups.map((recordGroup) => (
              <section
                key={recordGroup.id}
                aria-labelledby={
                  group === "none" ? undefined : `group-${recordGroup.id}`
                }
              >
                {group !== "none" ? (
                  <div className="mb-2 flex items-center justify-between gap-3 px-4 md:px-0">
                    <h2
                      id={`group-${recordGroup.id}`}
                      className="text-sm font-medium"
                    >
                      {recordGroup.label}
                    </h2>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {recordGroup.items.length} 条
                    </span>
                  </div>
                ) : null}
                <div className="act-feed">
                  {recordGroup.items.map(({ record }) => (
                    <RecordRow
                      key={record.id}
                      record={record}
                      onConvert={setTaskRecord}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <PageEmpty
            title="没有匹配的记录"
            description={
              query || flow !== "all"
                ? "调整搜索词或筛选条件后重试。"
                : "新记录会在保存后出现在这里。"
            }
          />
        </div>
      )}

      <TaskConfirmDialog
        key={taskRecord?.id ?? "closed-task-dialog"}
        record={taskRecord}
        open={Boolean(taskRecord)}
        onOpenChange={(open) => !open && setTaskRecord(null)}
      />
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>永久删除这条原始记录？</AlertDialogTitle>
            <AlertDialogDescription>
              关联任务和引用将由云端一并处理，此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteRecord.isPending}
            >
              永久删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
