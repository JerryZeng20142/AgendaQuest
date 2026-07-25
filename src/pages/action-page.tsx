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
  Plus,
  Search,
  Split,
  Trash2,
} from "lucide-react"
import { Link, useSearchParams } from "react-router"
import { toast } from "sonner"

import { useAgendaApi } from "@/api/api-context"
import { PageEmpty, PageError, PageLoading } from "@/components/page-state"
import { useDocumentTitle } from "@/hooks/use-document-title"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
                      {
                        id: `step_${crypto.randomUUID()}`,
                        label: "",
                        completed: false,
                      },
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

function TaskCard({
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
  onCancelRun,
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
  onCancelRun(runId: string): void
}) {
  return (
    <Card
      className="max-md:rounded-none max-md:ring-0"
      aria-labelledby={`task-${task.id}`}
    >
      <CardHeader>
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle
              id={`task-${task.id}`}
              role="heading"
              aria-level={2}
              className="break-words"
            >
              {task.title}
            </CardTitle>
            <p className="text-sm break-words text-muted-foreground">
              下一步：{task.nextAction}
            </p>
          </div>
          <Badge
            variant={task.priority === "urgent" ? "destructive" : "outline"}
          >
            {taskStatusLabel(task.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="size-3.5" aria-hidden="true" />
            {formatDateTime(task.dueAt)}
          </span>
          <span className="tabular-nums">延期 {task.postponeCount} 次</span>
          <span className="font-mono" translate="no">
            rev {task.revision}
          </span>
        </div>
        {task.steps.length ? (
          <div className="flex flex-col gap-2">
            {task.steps.map((step) => (
              <label
                key={step.id}
                className="flex cursor-pointer items-start gap-3 rounded-md py-1 text-sm"
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
                  aria-label={`完成步骤：${step.label}`}
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
        {runs.length ? (
          <Accordion type="single" collapsible>
            <AccordionItem value="runs" className="border-0">
              <AccordionTrigger className="py-2">
                Agent 运行记录（{runs.length}）
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-3">
                  {runs.map((run) => (
                    <div
                      key={run.id}
                      className="flex items-start justify-between gap-3 border-b pb-2 last:border-0"
                    >
                      <div className="min-w-0 text-xs">
                        <div className="mb-1 flex items-center gap-2">
                          <Badge variant="outline">{run.status}</Badge>
                          <span>{run.permissionScope}</span>
                        </div>
                        <p className="break-words text-muted-foreground">
                          {run.resultSummary ??
                            run.failureReason ??
                            run.logs.at(-1)?.message ??
                            "等待云端状态更新。"}
                        </p>
                        <div className="mt-3 flex flex-col gap-2">
                          <p className="font-medium">执行动作</p>
                          <ol className="flex flex-col gap-1">
                            {run.actions.map((action, index) => (
                              <li key={action.id}>
                                {index + 1}. {action.label}（{action.status}）
                              </li>
                            ))}
                          </ol>
                          <p className="pt-1 font-medium">完整日志</p>
                          {run.logs.length ? (
                            <ol className="flex flex-col gap-1">
                              {run.logs.map((log, index) => (
                                <li key={`${log.at}-${index}`}>
                                  <time dateTime={log.at}>
                                    {formatDateTime(log.at)}
                                  </time>
                                  ：{log.message}
                                </li>
                              ))}
                            </ol>
                          ) : (
                            <p className="text-muted-foreground">暂无日志。</p>
                          )}
                        </div>
                      </div>
                      {run.status === "queued" || run.status === "running" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onCancelRun(run.id)}
                        >
                          取消运行
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" asChild>
          <Link to={`/inbox?record=${encodeURIComponent(task.recordId)}`}>
            <FileText data-icon="inline-start" aria-hidden="true" />
            查看原始记录
          </Link>
        </Button>
        {task.status === "archived" ? null : task.status !== "completed" ? (
          <>
            {task.status !== "in-progress" ? (
              <Button
                size="sm"
                onClick={() => onStart(task)}
                disabled={pending}
              >
                <CirclePlay data-icon="inline-start" aria-hidden="true" />
                开始执行
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPostpone(task)}
              disabled={pending}
            >
              <Clock3 data-icon="inline-start" aria-hidden="true" />
              延后 1 天
            </Button>
            <Button size="sm" variant="outline" onClick={() => onEdit(task)}>
              <Split data-icon="inline-start" aria-hidden="true" />
              调整 / 拆分
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onComplete(task)}
              disabled={pending}
            >
              <Check data-icon="inline-start" aria-hidden="true" />
              标记完成
            </Button>
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
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={() => onArchive(task)}>
            <Archive data-icon="inline-start" aria-hidden="true" />
            归档任务
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

export default function ActionPage() {
  useDocumentTitle("行动台")
  const api = useAgendaApi()
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
      toast.success(
        api.mode === "cloud"
          ? "任务已更新并进入同步队列。"
          : "任务已在当前预览会话中更新。"
      )
      return true
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "任务更新失败，请刷新后重试。"
      )
      return false
    }
  }

  const startTask = async (task: AgendaTask) => {
    try {
      await actions.startTask.mutateAsync({
        taskId: task.id,
        revision: task.revision,
      })
      toast.success("任务已开始执行。")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "任务未能开始。")
    }
  }

  const postponeTask = async (task: AgendaTask) => {
    try {
      await actions.postponeTask.mutateAsync({
        taskId: task.id,
        revision: task.revision,
        days: 1,
      })
      toast.success("任务已延后 1 天。")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "任务未能延期。")
    }
  }

  const completeTask = async (task: AgendaTask) => {
    try {
      await actions.completeTask.mutateAsync({
        taskId: task.id,
        revision: task.revision,
      })
      toast.success(
        api.mode === "cloud"
          ? "任务已完成，云端将同步处理提醒与审计记录。"
          : "任务已在当前预览会话中标记完成。"
      )
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

  const cancelRun = async (runId: string) => {
    try {
      await actions.cancelAgentRun.mutateAsync(runId)
      toast.success("已请求取消 Agent 运行。")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Agent 运行未能取消。"
      )
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
      <h1 className="sr-only">行动台</h1>
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
        <div className="flex flex-col gap-3 md:mx-auto md:max-w-5xl">
          {tasks.map((task) => (
            <TaskCard
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
              onCancelRun={(runId) => void cancelRun(runId)}
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
