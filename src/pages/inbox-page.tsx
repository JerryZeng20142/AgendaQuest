import { useMemo, useState } from "react"
import {
  Archive,
  ArrowRight,
  Bot,
  Clock3,
  Download,
  Paperclip,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react"
import { Link, useSearchParams } from "react-router"
import { toast } from "sonner"

import { useAgendaApi } from "@/api/api-context"
import { PageEmpty, PageError, PageLoading } from "@/components/page-state"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
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
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  useAgendaActions,
  useAgendaSnapshot,
} from "@/features/agenda/use-agenda"
import { recordStatusLabel } from "@/features/agenda/status"
import { TaskConfirmDialog } from "@/features/records/task-confirm-dialog"
import {
  evidenceStateLabel,
  formatDateTime,
  formatFileSize,
} from "@/lib/format"
import type { AgendaRecord, RecordAttachment } from "@/lib/types"

type InboxView = "all" | "review" | "tasks" | "reference"

const viewOptions: Array<{ value: InboxView; label: string }> = [
  { value: "all", label: "全部内容" },
  { value: "review", label: "待 AI 确认" },
  { value: "tasks", label: "已生成任务" },
  { value: "reference", label: "资料 / 想法" },
]

function matchesView(record: AgendaRecord, view: InboxView) {
  if (record.status === "archived") return false
  if (view === "tasks") return Boolean(record.taskId)
  if (view === "reference")
    return (
      record.analysis.kind === "reference" || record.analysis.kind === "idea"
    )
  if (view === "review")
    return (
      !record.taskId &&
      ["queued", "needs-review", "ready", "failed"].includes(record.status)
    )
  return true
}

function RecordCard({
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

  return (
    <Card
      className="max-md:rounded-none max-md:ring-0"
      aria-labelledby={`record-${record.id}`}
    >
      <CardHeader>
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-2">
            <CardTitle
              id={`record-${record.id}`}
              role="heading"
              aria-level={2}
              className="text-sm leading-relaxed font-normal break-words"
            >
              {record.rawContent ??
                record.retainedSummary ??
                "原始内容已按保留策略删除。"}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{record.source}</span>
              <span aria-hidden="true">·</span>
              <time dateTime={record.createdAt}>
                {formatDateTime(record.createdAt)}
              </time>
              {record.attachments.length ? (
                <span className="inline-flex items-center gap-1">
                  <Paperclip aria-hidden="true" className="size-3" />
                  <span className="tabular-nums">
                    {record.attachments.length}
                  </span>
                </span>
              ) : null}
            </div>
          </div>
          <Badge
            variant={record.status === "failed" ? "destructive" : "outline"}
          >
            {recordStatusLabel(record.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="border-t pt-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Sparkles
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <h3 className="text-sm font-medium">AI 识别解析</h3>
            <Badge variant="secondary">
              {record.analysis.kind ?? "未分类"}
            </Badge>
          </div>
          {record.analysis.status === "complete" ? (
            <dl className="grid gap-3 text-sm md:grid-cols-[7rem_1fr]">
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
          <Accordion type="single" collapsible className="mt-2">
            <AccordionItem value="trace" className="border-0">
              <AccordionTrigger className="py-2 text-xs font-normal text-muted-foreground">
                查看处理追踪
              </AccordionTrigger>
              <AccordionContent>
                <dl className="grid gap-2 text-xs md:grid-cols-[7rem_1fr]">
                  <dt className="text-muted-foreground">原文已保存</dt>
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
                {record.analysisHistory.length ? (
                  <div className="mt-4 border-t pt-3">
                    <h4 className="mb-2 text-xs font-medium">分析历史详情</h4>
                    <ol className="flex flex-col gap-3">
                      {record.analysisHistory.map((analysis, index) => (
                        <li
                          key={
                            analysis.runId ?? `${analysis.requestedAt}-${index}`
                          }
                          className="border-b pb-3 text-xs last:border-0 last:pb-0"
                        >
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{analysis.status}</Badge>
                            <time
                              dateTime={analysis.requestedAt}
                              className="text-muted-foreground"
                            >
                              {formatDateTime(analysis.requestedAt)}
                            </time>
                            {analysis.runId ? (
                              <span
                                className="font-mono break-all text-muted-foreground"
                                translate="no"
                              >
                                {analysis.runId}
                              </span>
                            ) : null}
                          </div>
                          <p className="break-words">
                            {analysis.title ??
                              analysis.failureReason ??
                              "本次运行没有生成摘要。"}
                          </p>
                          {analysis.completedAt ? (
                            <p className="mt-1 text-muted-foreground">
                              完成于 {formatDateTime(analysis.completedAt)}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
                {record.attachments.length ? (
                  <div className="mt-4 border-t pt-3">
                    <h4 className="mb-2 text-xs font-medium">原始附件</h4>
                    <ul className="flex flex-col gap-2">
                      {record.attachments.map((attachment) => (
                        <li
                          key={attachment.id}
                          className="flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {attachment.name}
                            </p>
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
                    {api.mode !== "cloud" ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        预览模式仅保留附件元数据，不提供云端下载。
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        {!record.taskId ? (
          <Button size="sm" onClick={() => onConvert(record)}>
            <ArrowRight data-icon="inline-start" aria-hidden="true" />
            转为任务
          </Button>
        ) : null}
        {!record.taskId &&
        api.mode === "cloud" &&
        ["failed", "unavailable"].includes(record.analysis.status) ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => void retryAnalysis()}
            disabled={requestRecordAnalysis.isPending}
          >
            <Sparkles data-icon="inline-start" aria-hidden="true" />
            {requestRecordAnalysis.isPending ? "正在提交…" : "重新分析"}
          </Button>
        ) : null}
        {record.taskId ? (
          <Button size="sm" variant="outline" asChild>
            <Link to={`/action?task=${encodeURIComponent(record.taskId)}`}>
              <Bot data-icon="inline-start" aria-hidden="true" />
              查看任务
            </Link>
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          onClick={archive}
          disabled={archiveRecord.isPending}
        >
          <Archive data-icon="inline-start" aria-hidden="true" />
          仅归档保存
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => onDelete(record)}
        >
          <Trash2 data-icon="inline-start" aria-hidden="true" />
          删除
        </Button>
      </CardFooter>
    </Card>
  )
}

export default function InboxPage() {
  const snapshot = useAgendaSnapshot()
  const { deleteRecord } = useAgendaActions()
  const [params, setParams] = useSearchParams()
  const [taskRecord, setTaskRecord] = useState<AgendaRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AgendaRecord | null>(null)
  const requestedView = params.get("view") as InboxView | null
  const view = viewOptions.some((item) => item.value === requestedView)
    ? requestedView!
    : "all"
  const query = params.get("q") ?? ""
  const focusId = params.get("record")

  const records = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("zh-CN")
    return (snapshot.data?.records ?? []).filter((record) => {
      if (focusId) return record.id === focusId && record.status !== "archived"
      if (!matchesView(record, view)) return false
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
  }, [snapshot.data?.records, view, query, focusId])

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
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
    <div className="py-3 md:p-6">
      <h1 className="sr-only">我的收集箱</h1>
      <div className="mb-4 flex flex-col gap-3 px-4 md:px-0">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            value={view}
            onValueChange={(value) => updateParam("view", value)}
            className="min-w-0 overflow-x-auto"
          >
            <TabsList variant="line" className="min-w-max">
              {viewOptions.map((item) => (
                <TabsTrigger key={item.value} value={item.value}>
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <InputGroup className="max-w-md">
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              name="record-search"
              value={query}
              onChange={(event) => updateParam("q", event.target.value)}
              placeholder="搜索原始记录、话题或任务…"
              aria-label="搜索收集箱"
              autoComplete="off"
            />
          </InputGroup>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock3 className="size-3.5" aria-hidden="true" />
          <span>先保存原文，再启动分析</span>
        </div>
      </div>
      {records.length ? (
        <div className="flex flex-col gap-3 md:mx-auto md:max-w-5xl">
          {records.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              onConvert={setTaskRecord}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      ) : (
        <PageEmpty
          title="没有匹配的记录"
          description={
            query
              ? "调整搜索词或筛选条件后重试。"
              : "新记录会在保存后出现在这里。"
          }
        />
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
