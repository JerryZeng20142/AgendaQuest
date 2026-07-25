import { useMemo, useState, type FormEvent } from "react"
import {
  Archive,
  Bot,
  CalendarClock,
  Check,
  CirclePlay,
  Clock3,
  FileText,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Split,
  Trash2,
} from "lucide-react"
import { Link, useSearchParams } from "react-router"
import { toast } from "sonner"

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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
//
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  useAgendaActions,
  useAgendaSnapshot,
} from "@/features/agenda/use-agenda"
import { taskStatusLabel } from "@/lib/format"
import { formatDateTime, toLocalDateTimeInput } from "@/lib/format"
import type { AgendaTask, AgentRun, Capability, TaskStep } from "@/lib/types"
import { AgentAuthorizationDialog } from "@/features/tasks/agent-authorization-dialog"

type ActionView =
  "pending" | "now" | "today" | "upcoming" | "in-progress" | "completed"

const actionViews: Array<{ value: ActionView; label: string }> = [
  { value: "pending", label: "待确认" },
  { value: "now", label: "现在执行" },
  { value: "today", label: "今日任务" },
  { value: "upcoming", label: "即将到期" },
  { value: "in-progress", label: "进行中" },
  { value: "completed", label: "已完成" },
]

const SNOOZE_PRESETS = [
  { label: "1 小时后", resolve: () => new Date(Date.now() + 60 * 60 * 1000) },
  {
    label: "明天早上",
    resolve: () => {
      const d = new Date()
      d.setDate(d.getDate() + 1)
      d.setHours(9, 0, 0, 0)
      return d
    },
  },
  {
    label: "下周",
    resolve: () => {
      const d = new Date()
      d.setDate(d.getDate() + 7)
      d.setHours(9, 0, 0, 0)
      return d
    },
  },
]

/** Compact one-line display for a single task. */
function TaskRow({
  task,
  runs,
  agentCapability,
  pending,
  onUpdateDetails,
  onStart,
  onPostpone,
  onComplete,
  onEdit,
  onAgent,
  onArchive,
  // onCancelRun — available when agent run cancellation is wired through
  onDelete,
}: {
  task: AgendaTask
  runs: AgentRun[]
  agentCapability: Capability | undefined
  pending: boolean
  onUpdateDetails(task: AgendaTask): void
  onStart(task: AgendaTask): void
  onPostpone(task: AgendaTask): void
  onComplete(task: AgendaTask): void
  onEdit(task: AgendaTask): void
  onAgent(task: AgendaTask): void
  onArchive(task: AgendaTask): void
  onDelete(task: AgendaTask): void
}) {
  const [deleteOpen, setDeleteOpen] = useState(false)

  const mainButton = (
    <button
      type="button"
      className="task-feed-main"
      onClick={() => onEdit(task)}
    >
      <span className="task-feed-meta">
        <Badge
          variant={
            task.status === "pending"
              ? "secondary"
              : task.status === "completed"
                ? "outline"
                : "default"
          }
        >
          {taskStatusLabel(task.status)}
        </Badge>
        {task.dueAt ? (
          <>
            <CalendarClock className="size-3" aria-hidden="true" />
            <span>{formatDateTime(task.dueAt)}</span>
          </>
        ) : null}
      </span>
      <strong>{task.title}</strong>
    </button>
  )

  return (
    <div
      className="task-feed-item"
      aria-labelledby={`task-${task.id}`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {mainButton}
          <p className="truncate text-xs text-muted-foreground" title={task.nextAction}>
            {task.nextAction}
          </p>
          {task.steps.length ? (
            <div className="mt-2 flex flex-col gap-1">
              {task.steps.map((step) => (
                <label
                  key={step.id}
                  className="flex cursor-pointer items-start gap-2 py-0.5 text-sm"
                >
                  <Checkbox
                    checked={step.completed}
                    onCheckedChange={(checked) =>
                      onUpdateDetails({
                        ...task,
                        steps: task.steps.map((item) =>
                          item.id === step.id
                            ? { ...item, completed: checked === true }
                            : item
                        ),
                      })
                    }
                    disabled={pending || task.status === "completed"}
                    aria-label={`${step.label}${step.completed ? "（已完成）" : ""}`}
                  />
                  <span
                    className={
                      step.completed
                        ? "text-muted-foreground line-through"
                        : "break-words"
                    }
                  >
                    {step.label}
                  </span>
                </label>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <footer className="task-feed-actions">
        {task.status === "archived" ? (
          <Button size="sm" variant="ghost" onClick={() => onDelete(task)}>
            <Trash2 data-icon="inline-start" aria-hidden="true" />
            删除
          </Button>
        ) : task.status === "completed" ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onArchive(task)}
              disabled={pending}
            >
              <Archive data-icon="inline-start" aria-hidden="true" />
              归档
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="更多操作">
                  <MoreHorizontal aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onDelete(task)}>
                  <Trash2 />删除任务
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <>
            {(task.status === "pending" || task.status === "now") && (
              <Button
                size="sm"
                onClick={() => onStart(task)}
                disabled={pending}
              >
                <CirclePlay data-icon="inline-start" aria-hidden="true" />
                开始
              </Button>
            )}
            {task.status !== "in-progress" && task.status !== "pending" ? null : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      onClick={() => onAgent(task)}
                      disabled={agentCapability?.state !== "available"}
                    >
                      <Bot data-icon="inline-start" aria-hidden="true" />
                      交给 Agent
                    </Button>
                  </span>
                </TooltipTrigger>
                {agentCapability?.state !== "available" ? (
                  <TooltipContent>
                    {agentCapability?.detail ?? "Agent 状态未知"}
                  </TooltipContent>
                ) : null}
              </Tooltip>
            )}
            <Button size="sm" variant="ghost" onClick={() => onComplete(task)} disabled={pending}>
              <Check data-icon="inline-start" aria-hidden="true" />
              完成
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="推迟">
                  <Clock3 aria-hidden="true" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-40 p-1">
                <div className="flex flex-col gap-0.5">
                  {SNOOZE_PRESETS.map((preset) => (
                    <Button
                      key={preset.label}
                      variant="ghost"
                      size="sm"
                      className="justify-start"
                      onClick={() => {
                        onPostpone({
                          ...task,
                          dueAt: preset.resolve().toISOString(),
                        })
                      }}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="更多">
                  <MoreHorizontal aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  <Split />调整 / 拆分
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={`/inbox?record=${encodeURIComponent(task.recordId)}`}>
                    <FileText />查看来源
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 />删除任务
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </footer>

      {runs.length ? (
        <details className="mt-2 text-xs text-muted-foreground">
          <summary className="cursor-pointer">
            Agent 运行记录（{runs.length}）
          </summary>
          <div className="mt-1 flex flex-col gap-2 border-l-2 pl-3">
            {runs.map((run) => (
              <div key={run.id}>
                <span className="font-medium">{run.status}</span>
                {": "}
                {run.resultSummary ?? run.failureReason ?? ""}
              </div>
            ))}
          </div>
        </details>
      ) : null}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除这个任务？</AlertDialogTitle>
            <AlertDialogDescription>
              原始收集记录仍会保留，此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setDeleteOpen(false)
                onDelete(task)
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export function EditTaskDialog({
  task,
  open,
  onOpenChange,
  onSave,
  pending,
}: {
  task: AgendaTask | null
  open: boolean
  onOpenChange(open: boolean): void
  onSave(task: AgendaTask): Promise<boolean>
  pending: boolean
}) {
  const [dueAt, setDueAt] = useState(() => toLocalDateTimeInput(task?.dueAt))
  const [steps, setSteps] = useState<TaskStep[]>(
    () => task?.steps.map((step) => ({ ...step })) ?? []
  )

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!task) return
    const saved = await onSave({
      ...task,
      dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
      steps: steps
        .map((step) => ({ ...step, label: step.label.trim() }))
        .filter((step) => step.label),
    })
    if (saved) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>调整任务</DialogTitle>
          <DialogDescription>{task?.title}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-due-at">截止时间</FieldLabel>
              <Input
                id="edit-due-at"
                name="dueAt"
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
                autoComplete="off"
              />
            </Field>
            <Field>
              <div className="flex items-center justify-between gap-2">
                <FieldTitle>执行步骤</FieldTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSteps((items) => [
                      ...items,
                      { id: `step_${crypto.randomUUID()}`, label: "", completed: false },
                    ])
                  }
                >
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  添加步骤
                </Button>
              </div>
              {steps.map((step, index) => (
                <div className="flex gap-2" key={step.id}>
                  <Input
                    name={`edit-step-${index}`}
                    value={step.label}
                    onChange={(event) =>
                      setSteps((items) =>
                        items.map((item) =>
                          item.id === step.id
                            ? { ...item, label: event.target.value }
                            : item
                        )
                      )
                    }
                    aria-label={`执行步骤 ${index + 1}`}
                    autoComplete="off"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setSteps((items) =>
                        items.filter((item) => item.id !== step.id)
                      )
                    }
                    aria-label={`删除执行步骤 ${index + 1}`}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <Loader2
                    data-icon="inline-start"
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : null}
                {pending ? "正在保存…" : "保存调整"}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function ActionPage() {
  useDocumentTitle("行动")
  const snapshot = useAgendaSnapshot()
  const actions = useAgendaActions()
  const [params, setParams] = useSearchParams()
  const [editTask, setEditTask] = useState<AgendaTask | null>(null)
  const [agentTask, setAgentTask] = useState<AgendaTask | null>(null)
  const requestedView = params.get("view") as ActionView | null
  const requestedTaskId = params.get("task")
  const requestedTask = snapshot.data?.tasks.find(
    (task) => task.id === requestedTaskId
  )
  const view: ActionView =
    requestedTask &&
    actionViews.some((item) => item.value === requestedTask.status)
      ? (requestedTask.status as ActionView)
      : actionViews.some((item) => item.value === requestedView)
        ? requestedView!
        : "now"
  const query = params.get("q") ?? ""
  const agentCapability = snapshot.data?.capabilities.find(
    (capability) => capability.id === "agent"
  )

  const tasks = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("zh-CN")
    return (snapshot.data?.tasks ?? []).filter((task) => {
      if (requestedTaskId) return task.id === requestedTaskId
      if (task.status !== view) return false
      return (
        !normalized ||
        `${task.title} ${task.nextAction}`
          .toLocaleLowerCase("zh-CN")
          .includes(normalized)
      )
    })
  }, [snapshot.data?.tasks, query, requestedTaskId, view])

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (key === "view" || key === "q") next.delete("task")
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const updateTaskDetails = async (task: AgendaTask) => {
    try {
      await actions.updateTaskDetails.mutateAsync({
        taskId: task.id,
        revision: task.revision,
        dueAt: task.dueAt,
        steps: task.steps,
      })
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "任务更新失败，请刷新后重试。")
      return false
    }
  }

  const startTask = async (task: AgendaTask) => {
    try {
      await actions.startTask.mutateAsync({ taskId: task.id, revision: task.revision })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "任务未能开始。")
    }
  }

  const postponeTask = async (task: AgendaTask) => {
    try {
      await actions.postponeTask.mutateAsync({ taskId: task.id, revision: task.revision, days: 1 })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "任务未能延期。")
    }
  }

  const completeTask = async (task: AgendaTask) => {
    try {
      await actions.completeTask.mutateAsync({ taskId: task.id, revision: task.revision })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "任务未能完成。")
    }
  }

  const taskMutationPending =
    actions.updateTaskDetails.isPending ||
    actions.startTask.isPending ||
    actions.postponeTask.isPending ||
    actions.completeTask.isPending

  const archiveTask = async (task: AgendaTask) => {
    try {
      await actions.archiveTask.mutateAsync(task.id)
      toast.success("任务已归档。")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "任务归档失败。")
    }
  }

  const deleteTask = async (task: AgendaTask) => {
    try {
      await actions.deleteTask.mutateAsync(task.id)
      toast.success("任务已永久删除。")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "任务删除失败。")
    }
  }

  // cancelAgentRun is available via useAgendaActions but not wired through TaskRow yet

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
      <h1 className="sr-only">行动</h1>
      <div className="mb-4 flex flex-col gap-3 px-4 md:mx-auto md:max-w-5xl md:px-0 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={view}
          onValueChange={(value) => updateParam("view", value)}
          className="min-w-0 overflow-x-auto"
        >
          <TabsList variant="line" className="min-w-max">
            {actionViews.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <InputGroup className="max-w-sm">
          <InputGroupAddon>
            <Search aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            name="task-search"
            value={query}
            onChange={(event) => updateParam("q", event.target.value)}
            placeholder="搜索任务…"
            aria-label="搜索任务"
            autoComplete="off"
          />
        </InputGroup>
      </div>
      {tasks.length ? (
        <div className="act-feed md:mx-auto md:max-w-5xl">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              runs={(snapshot.data?.agentRuns ?? []).filter(
                (run) => run.taskId === task.id
              )}
              agentCapability={agentCapability}
              pending={taskMutationPending}
              onUpdateDetails={(nextTask) => void updateTaskDetails(nextTask)}
              onStart={(nextTask) => void startTask(nextTask)}
              onPostpone={(nextTask) => void postponeTask(nextTask)}
              onComplete={(nextTask) => void completeTask(nextTask)}
              onEdit={setEditTask}
              onAgent={setAgentTask}
              onArchive={(nextTask) => void archiveTask(nextTask)}
              onDelete={(nextTask) => void deleteTask(nextTask)}
            />
          ))}
        </div>
      ) : (
        <PageEmpty
          title="这个视图没有任务"
          description="任务状态改变后会自动移动到对应视图。"
        />
      )}

      <EditTaskDialog
        key={editTask?.id ?? "closed-edit-dialog"}
        task={editTask}
        open={Boolean(editTask)}
        onOpenChange={(open) => !open && setEditTask(null)}
        onSave={updateTaskDetails}
        pending={actions.updateTaskDetails.isPending}
      />
      <AgentAuthorizationDialog
        key={agentTask?.id ?? "closed-agent-dialog"}
        task={agentTask}
        capability={agentCapability}
        open={Boolean(agentTask)}
        onOpenChange={(open) => !open && setAgentTask(null)}
      />
    </div>
  )
}
