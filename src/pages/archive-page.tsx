import { useMemo, useState } from "react"
import {
  FileText,
  Loader2,
  RotateCcw,
  Search,
  Settings2,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { useAgendaApi } from "@/api/api-context"
import { PageEmpty, PageError, PageLoading } from "@/components/page-state"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  useAgendaActions,
  useAgendaSnapshot,
} from "@/features/agenda/use-agenda"
import { formatDateTime } from "@/lib/format"
import type { RetentionPolicy, UpdateRetentionPolicyInput } from "@/lib/types"
import { cn } from "@/lib/utils"

type ArchiveEntry = {
  id: string
  kind: "record" | "task"
  title: string
  detail: string
  archivedAt: string
}

const retentionLabels: Record<RetentionPolicy["mode"], string> = {
  "keep-full": "完整保留",
  "keep-summary": "仅保留摘要",
  "delete-after": "定期删除",
}

export function ArchivePage({ embedded = false }: { embedded?: boolean }) {
  const api = useAgendaApi()
  const snapshot = useAgendaSnapshot()
  const actions = useAgendaActions()
  const [query, setQuery] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<ArchiveEntry | null>(null)
  const [viewTarget, setViewTarget] = useState<ArchiveEntry | null>(null)
  const [retentionOpen, setRetentionOpen] = useState(false)
  const [retentionConfirmOpen, setRetentionConfirmOpen] = useState(false)
  const [retentionMode, setRetentionMode] =
    useState<RetentionPolicy["mode"]>("keep-full")
  const [deleteAfterDays, setDeleteAfterDays] = useState("30")
  const [retentionError, setRetentionError] = useState("")

  const entries = useMemo<ArchiveEntry[]>(() => {
    if (!snapshot.data) return []
    const records = snapshot.data.records
      .filter((record) => record.status === "archived")
      .map((record) => ({
        id: record.id,
        kind: "record" as const,
        title:
          record.analysis.title ??
          record.rawContent ??
          record.retainedSummary ??
          "原始内容已按保留策略删除",
        detail:
          record.rawContent ??
          record.retainedSummary ??
          "原始内容已按保留策略删除",
        archivedAt: record.updatedAt,
      }))
    const tasks = snapshot.data.tasks
      .filter((task) => task.status === "archived")
      .map((task) => ({
        id: task.id,
        kind: "task" as const,
        title: task.title,
        detail: task.nextAction,
        archivedAt: task.archivedAt ?? task.completedAt ?? task.createdAt,
      }))
    const normalized = query.trim().toLocaleLowerCase("zh-CN")
    return [...records, ...tasks]
      .filter(
        (entry) =>
          !normalized ||
          `${entry.title} ${entry.detail}`
            .toLocaleLowerCase("zh-CN")
            .includes(normalized)
      )
      .sort((left, right) => right.archivedAt.localeCompare(left.archivedAt))
  }, [query, snapshot.data])

  const restore = async (entry: ArchiveEntry) => {
    try {
      if (entry.kind === "record")
        await actions.restoreRecord.mutateAsync(entry.id)
      else await actions.restoreTask.mutateAsync(entry.id)
      toast.success(
        entry.kind === "record"
          ? "记录已恢复到收集箱。"
          : "任务已恢复到待确认。"
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "恢复操作失败。")
    }
  }

  const permanentlyDelete = async () => {
    if (!deleteTarget) return
    try {
      if (deleteTarget.kind === "record")
        await actions.deleteRecord.mutateAsync(deleteTarget.id)
      else await actions.deleteTask.mutateAsync(deleteTarget.id)
      toast.success("归档内容已永久删除。")
      setDeleteTarget(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除操作失败。")
    }
  }

  const openRetentionDialog = () => {
    if (!snapshot.data) return
    const policy = snapshot.data.retentionPolicy
    setRetentionMode(policy.mode)
    setDeleteAfterDays(String(policy.deleteAfterDays ?? 30))
    setRetentionError("")
    setRetentionOpen(true)
  }

  const getRetentionInput = (): UpdateRetentionPolicyInput | null => {
    const days = Number(deleteAfterDays)
    if (
      retentionMode === "delete-after" &&
      (!Number.isInteger(days) || days < 1)
    ) {
      setRetentionError("请输入大于 0 的整数天数。")
      return null
    }

    setRetentionError("")
    return {
      mode: retentionMode,
      deleteAfterDays: retentionMode === "delete-after" ? days : undefined,
    }
  }

  const commitRetentionPolicy = async (input: UpdateRetentionPolicyInput) => {
    try {
      await actions.updateRetentionPolicy.mutateAsync(input)
      toast.success(
        api.mode === "preview"
          ? "保留策略已应用到当前预览会话。"
          : "保留策略已提交到云端。"
      )
      setRetentionConfirmOpen(false)
      setRetentionOpen(false)
    } catch (error) {
      setRetentionError(
        error instanceof Error ? error.message : "保留策略保存失败。"
      )
    } finally {
      actions.updateRetentionPolicy.reset()
    }
  }

  const saveRetentionPolicy = () => {
    const input = getRetentionInput()
    if (!input) return
    if (input.mode !== "keep-full") {
      setRetentionConfirmOpen(true)
      return
    }
    void commitRetentionPolicy(input)
  }

  const confirmRetentionPolicy = () => {
    const input = getRetentionInput()
    if (input) void commitRetentionPolicy(input)
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
    <div className={embedded ? undefined : "py-3 md:p-6"}>
      <div
        className={cn(
          "mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
          !embedded && "px-4 md:px-0"
        )}
      >
        <div>
          <h2 className="text-base font-semibold text-pretty">归档列表</h2>
          <p className="text-sm text-muted-foreground">
            恢复或永久删除已经归档的内容。
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <InputGroup className="min-w-0 flex-1 sm:w-64 sm:flex-none">
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              name="archive-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索归档…"
              aria-label="搜索归档"
              autoComplete="off"
            />
          </InputGroup>
          <Button variant="outline" onClick={openRetentionDialog}>
            <Settings2 data-icon="inline-start" aria-hidden="true" />
            保留策略
          </Button>
        </div>
      </div>

      {entries.length ? (
        <div
          className={cn(
            "border-y md:rounded-lg md:border",
            embedded && "rounded-lg border"
          )}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden w-24 sm:table-cell">
                  类型
                </TableHead>
                <TableHead>内容</TableHead>
                <TableHead className="hidden w-40 sm:table-cell">
                  归档时间
                </TableHead>
                <TableHead className="w-28 text-right sm:w-36">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={`${entry.kind}-${entry.id}`}>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline">
                      {entry.kind === "record" ? "原始记录" : "任务"}
                    </Badge>
                  </TableCell>
                  <TableCell className="min-w-0">
                    <div className="max-w-xl min-w-0">
                      <Badge variant="outline" className="mb-1 sm:hidden">
                        {entry.kind === "record" ? "原始记录" : "任务"}
                      </Badge>
                      <p className="truncate font-medium">{entry.title}</p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {entry.detail}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground tabular-nums sm:table-cell">
                    <time dateTime={entry.archivedAt}>
                      {formatDateTime(entry.archivedAt)}
                    </time>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewTarget(entry)}
                            aria-label={`查看归档详情：${entry.title}`}
                          >
                            <FileText aria-hidden="true" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>查看详情</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => void restore(entry)}
                            aria-label={`恢复：${entry.title}`}
                          >
                            <RotateCcw aria-hidden="true" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>恢复</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => setDeleteTarget(entry)}
                            aria-label={`永久删除：${entry.title}`}
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>永久删除</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <PageEmpty
          title="归档中没有内容"
          description={
            query
              ? "没有符合搜索条件的归档内容。"
              : "归档后的记录和任务会出现在这里。"
          }
        />
      )}

      <Dialog
        open={Boolean(viewTarget)}
        onOpenChange={(open) => !open && setViewTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="break-words">
              {viewTarget?.title}
            </DialogTitle>
            <DialogDescription>
              {viewTarget?.kind === "record" ? "原始记录" : "任务"} ·{" "}
              {formatDateTime(viewTarget?.archivedAt)}
            </DialogDescription>
          </DialogHeader>
          <p className="max-h-[60vh] overflow-y-auto text-sm break-words whitespace-pre-wrap">
            {viewTarget?.detail}
          </p>
        </DialogContent>
      </Dialog>

      <Dialog
        open={retentionOpen}
        onOpenChange={(open) => {
          setRetentionOpen(open)
          if (!open) {
            setRetentionError("")
            setRetentionConfirmOpen(false)
            actions.updateRetentionPolicy.reset()
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>数据保留策略</DialogTitle>
            <DialogDescription>
              {api.mode === "preview"
                ? "此设置仅影响当前预览会话，不会写入云端。"
                : "保存后会将策略提交到已连接的云端服务。"}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="retention-mode">保留方式</FieldLabel>
              <Select
                name="retentionMode"
                value={retentionMode}
                onValueChange={(value) => {
                  setRetentionMode(value as RetentionPolicy["mode"])
                  setRetentionError("")
                }}
              >
                <SelectTrigger id="retention-mode" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="keep-full">完整保留</SelectItem>
                    <SelectItem value="keep-summary">仅保留摘要</SelectItem>
                    <SelectItem value="delete-after">定期删除</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                {api.mode === "preview"
                  ? "仅记录当前预览会话中的选择，不会触发云端数据处理。"
                  : retentionMode === "keep-full"
                    ? "保留原始记录、推断结果和任务执行记录。"
                    : retentionMode === "keep-summary"
                      ? "仅长期保留摘要；原始数据由云端策略处理。"
                      : "超过指定天数的数据将由云端策略定期删除。"}
              </FieldDescription>
            </Field>
            {retentionMode === "delete-after" ? (
              <Field data-invalid={Boolean(retentionError)}>
                <FieldLabel htmlFor="retention-days">保留天数</FieldLabel>
                <Input
                  id="retention-days"
                  name="retentionDays"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={deleteAfterDays}
                  onChange={(event) => {
                    setDeleteAfterDays(event.target.value)
                    setRetentionError("")
                  }}
                  aria-invalid={Boolean(retentionError)}
                  aria-describedby={
                    retentionError ? "retention-days-error" : undefined
                  }
                />
                <FieldError id="retention-days-error">
                  {retentionError}
                </FieldError>
              </Field>
            ) : retentionError ? (
              <FieldError>{retentionError}</FieldError>
            ) : null}
          </FieldGroup>
          <p className="text-xs text-muted-foreground">
            当前策略：{retentionLabels[snapshot.data!.retentionPolicy.mode]}
            {snapshot.data!.retentionPolicy.mode === "delete-after" &&
            snapshot.data!.retentionPolicy.deleteAfterDays
              ? `（${snapshot.data!.retentionPolicy.deleteAfterDays} 天）`
              : ""}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRetentionOpen(false)}>
              取消
            </Button>
            <Button
              variant={
                retentionMode === "keep-full" ? "default" : "destructive"
              }
              onClick={saveRetentionPolicy}
              disabled={actions.updateRetentionPolicy.isPending}
            >
              {actions.updateRetentionPolicy.isPending ? (
                <Loader2
                  data-icon="inline-start"
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : null}
              {actions.updateRetentionPolicy.isPending
                ? "正在保存…"
                : "保存策略"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={retentionConfirmOpen}
        onOpenChange={setRetentionConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认减少原始证据保留？</AlertDialogTitle>
            <AlertDialogDescription>
              {retentionMode === "keep-summary"
                ? "云端执行后将只保留摘要，原始内容可能无法恢复。现有原始记录不会被摘要冒充。"
                : `超过 ${deleteAfterDays} 天的原始记录及派生数据将按云端策略删除，删除后无法恢复。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>返回检查</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmRetentionPolicy}
              disabled={actions.updateRetentionPolicy.isPending}
            >
              确认保存
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-md bg-destructive/10 text-destructive sm:mx-0">
              <FileText aria-hidden="true" />
            </div>
            <AlertDialogTitle>永久删除归档内容？</AlertDialogTitle>
            <AlertDialogDescription>
              {api.mode === "preview"
                ? `「${deleteTarget?.title}」将从当前预览会话中永久删除，无法恢复。`
                : `「${deleteTarget?.title}」及其云端关联数据将被永久删除，无法恢复。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={permanentlyDelete}
            >
              永久删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default ArchivePage
