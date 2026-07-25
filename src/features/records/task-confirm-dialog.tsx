import { useState, type FormEvent } from "react"
import { CalendarClock, Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

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
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { useAgendaActions } from "@/features/agenda/use-agenda"
import { toLocalDateTimeInput } from "@/lib/format"
import type { AgendaRecord } from "@/lib/types"

const taskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "请输入任务标题。")
    .max(120, "任务标题不能超过 120 个字符。"),
  nextAction: z
    .string()
    .trim()
    .min(1, "请输入明确的下一步行动。")
    .max(240, "下一步行动不能超过 240 个字符。"),
})

export function TaskConfirmDialog({
  record,
  open,
  onOpenChange,
}: {
  record: AgendaRecord | null
  open: boolean
  onOpenChange(open: boolean): void
}) {
  const { createTask } = useAgendaActions()
  const [title, setTitle] = useState(
    () =>
      record?.analysis.title ??
      record?.rawContent?.slice(0, 80) ??
      record?.retainedSummary?.slice(0, 80) ??
      ""
  )
  const [nextAction, setNextAction] = useState(
    () => record?.analysis.nextAction ?? ""
  )
  const [dueAt, setDueAt] = useState(() =>
    toLocalDateTimeInput(record?.analysis.suggestedDueAt)
  )
  const [steps, setSteps] = useState<string[]>(() =>
    record?.analysis.suggestedSteps ? [...record.analysis.suggestedSteps] : []
  )
  const [clientRequestId] = useState(() => crypto.randomUUID())
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!record) return
    const result = taskSchema.safeParse({ title, nextAction })
    if (!result.success) {
      const nextErrors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        const field = String(issue.path[0])
        if (!nextErrors[field]) nextErrors[field] = issue.message
      })
      setErrors(nextErrors)
      document.getElementById(`task-${Object.keys(nextErrors)[0]}`)?.focus()
      return
    }

    try {
      await createTask.mutateAsync({
        clientRequestId,
        recordId: record.id,
        title: result.data.title,
        nextAction: result.data.nextAction,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        steps: steps.map((step) => step.trim()).filter(Boolean),
      })
      toast.success("任务已创建，并保留与原始记录的关联。")
      onOpenChange(false)
    } catch (error) {
      setErrors({
        request:
          error instanceof Error ? error.message : "任务创建失败，请重试。",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(42rem,calc(100svh-2rem))] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>确认生成任务</DialogTitle>
          <DialogDescription>
            {record?.analysis.status === "complete"
              ? "调整 AI 建议后再创建，原始记录和推断结果不会被覆盖。"
              : "AI 当前未生成结果，请手工确认任务信息；原始记录仍会完整保留。"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <FieldGroup>
            <Field data-invalid={Boolean(errors.title)}>
              <FieldLabel htmlFor="task-title">任务标题</FieldLabel>
              <Input
                id="task-title"
                name="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                autoComplete="off"
                aria-invalid={Boolean(errors.title)}
              />
              <FieldError>{errors.title}</FieldError>
            </Field>
            <Field data-invalid={Boolean(errors.nextAction)}>
              <FieldLabel htmlFor="task-next-action">下一步行动</FieldLabel>
              <Textarea
                id="task-next-action"
                name="nextAction"
                value={nextAction}
                onChange={(event) => setNextAction(event.target.value)}
                autoComplete="off"
                className="min-h-20 resize-none"
                aria-invalid={Boolean(errors.nextAction)}
              />
              <FieldError>{errors.nextAction}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="task-due-at">
                <CalendarClock aria-hidden="true" />
                截止时间
              </FieldLabel>
              <Input
                id="task-due-at"
                name="dueAt"
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
                autoComplete="off"
              />
            </Field>
            <Separator />
            <Field>
              <div className="flex items-center justify-between gap-3">
                <FieldTitle>执行步骤</FieldTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSteps((items) => [...items, ""])}
                >
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  添加步骤
                </Button>
              </div>
              {steps.length ? (
                <div className="flex flex-col gap-2">
                  {steps.map((step, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        name={`step-${index}`}
                        value={step}
                        onChange={(event) =>
                          setSteps((items) =>
                            items.map((item, itemIndex) =>
                              itemIndex === index ? event.target.value : item
                            )
                          )
                        }
                        autoComplete="off"
                        aria-label={`执行步骤 ${index + 1}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setSteps((items) =>
                            items.filter((_, itemIndex) => itemIndex !== index)
                          )
                        }
                        aria-label={`删除执行步骤 ${index + 1}`}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">没有拆分步骤。</p>
              )}
            </Field>
            <FieldError>{errors.request}</FieldError>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={createTask.isPending}>
                {createTask.isPending ? (
                  <Loader2
                    data-icon="inline-start"
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : null}
                {createTask.isPending ? "正在创建…" : "创建任务"}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
