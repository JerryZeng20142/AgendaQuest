import { useEffect, useState } from "react"
import { Bot, Loader2, ShieldAlert } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useAgendaActions } from "@/features/agenda/use-agenda"
import type { AgendaTask, AgentPlan, Capability } from "@/lib/types"

const riskLabels = { low: "低风险", medium: "中风险", high: "高风险" }
const scopeOptions = {
  "current-task": {
    title: "仅当前任务",
    description: "授权计划内的全部动作。",
  },
  "current-step": {
    title: "仅当前步骤",
    description: "只授权计划中的第 1 个动作。",
  },
}

export function AgentAuthorizationDialog({
  task,
  capability,
  open,
  onOpenChange,
}: {
  task: AgendaTask | null
  capability: Capability | undefined
  open: boolean
  onOpenChange(open: boolean): void
}) {
  const { prepareAgentRun, authorizeAgentRun } = useAgendaActions()
  const [plan, setPlan] = useState<AgentPlan | null>(null)
  const [scope, setScope] = useState<"current-task" | "current-step">(
    "current-task"
  )
  const [confirmedActionIds, setConfirmedActionIds] = useState<string[]>([])
  const [error, setError] = useState("")
  const preparePlan = prepareAgentRun.mutateAsync

  useEffect(() => {
    if (!open || !task || capability?.state !== "available") return
    preparePlan(task.id)
      .then((nextPlan) => {
        if (!nextPlan.permissionOptions.length) {
          throw new Error("执行计划没有可授权的权限范围。")
        }
        setPlan(nextPlan)
        setScope(nextPlan.permissionOptions[0])
      })
      .catch((reason) =>
        setError(
          reason instanceof Error ? reason.message : "执行计划读取失败。"
        )
      )
  }, [open, task, capability?.state, preparePlan])

  const authorize = async () => {
    if (!plan) return
    if (!plan.permissionOptions.includes(scope)) {
      setError("所选权限范围不在服务端计划允许范围内。")
      return
    }
    const authorizedActions =
      scope === "current-step" ? plan.actions.slice(0, 1) : plan.actions
    const requiredActionIds = authorizedActions.map((action) => action.id)
    if (
      plan.risk === "high" &&
      !requiredActionIds.every((id) => confirmedActionIds.includes(id))
    ) {
      setError("高风险计划需要逐项确认全部动作。")
      return
    }
    setError("")
    try {
      await authorizeAgentRun.mutateAsync({
        planId: plan.id,
        confirmationId: plan.confirmationId,
        permissionScope: scope,
        confirmedActionIds:
          plan.risk === "high"
            ? confirmedActionIds.filter((id) => requiredActionIds.includes(id))
            : [],
      })
      toast.success("授权已提交，运行状态将定期从云端刷新。")
      onOpenChange(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "授权未能提交。")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agent 自动化执行授权</DialogTitle>
          <DialogDescription>{task?.title}</DialogDescription>
        </DialogHeader>
        {capability?.state !== "available" ? (
          <Alert variant="destructive">
            <ShieldAlert aria-hidden="true" />
            <AlertTitle>Agent 当前不可用</AlertTitle>
            <AlertDescription>
              {capability?.detail ?? "未读取到 Agent 能力状态。"}
            </AlertDescription>
          </Alert>
        ) : prepareAgentRun.isPending ? (
          <div
            className="flex min-h-32 items-center justify-center gap-2 text-sm text-muted-foreground"
            aria-live="polite"
          >
            <Loader2 className="animate-spin" aria-hidden="true" />
            正在读取执行计划…
          </div>
        ) : plan ? (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">服务端执行计划</span>
              <Badge variant={plan.risk === "high" ? "destructive" : "outline"}>
                {riskLabels[plan.risk]}
              </Badge>
            </div>
            <ol className="flex flex-col gap-2 text-sm">
              {plan.actions.map((action, index) => (
                <li
                  key={action.id}
                  className="flex gap-3 border-b pb-2 last:border-b-0"
                >
                  {plan.risk === "high" ? (
                    <Checkbox
                      checked={confirmedActionIds.includes(action.id)}
                      disabled={scope === "current-step" && index > 0}
                      onCheckedChange={(checked) =>
                        setConfirmedActionIds((current) =>
                          checked === true
                            ? [...new Set([...current, action.id])]
                            : current.filter((item) => item !== action.id)
                        )
                      }
                      aria-label={`确认高风险动作 ${index + 1}：${action.label}`}
                    />
                  ) : (
                    <span className="text-muted-foreground tabular-nums">
                      {index + 1}
                    </span>
                  )}
                  <span className="min-w-0 break-words">
                    {plan.risk === "high" ? `${index + 1}. ` : ""}
                    {action.label}
                  </span>
                </li>
              ))}
            </ol>
            <RadioGroup
              value={scope}
              onValueChange={(value) => setScope(value as typeof scope)}
            >
              {plan.permissionOptions.map((option) => (
                <FieldLabel key={option}>
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldTitle>{scopeOptions[option].title}</FieldTitle>
                      <FieldDescription>
                        {scopeOptions[option].description}
                      </FieldDescription>
                    </FieldContent>
                    <RadioGroupItem value={option} />
                  </Field>
                </FieldLabel>
              ))}
            </RadioGroup>
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={authorize}
            disabled={
              !plan ||
              authorizeAgentRun.isPending ||
              (plan.risk === "high" &&
                !(
                  scope === "current-step"
                    ? plan.actions.slice(0, 1)
                    : plan.actions
                ).every((action) => confirmedActionIds.includes(action.id)))
            }
          >
            {authorizeAgentRun.isPending ? (
              <Loader2
                data-icon="inline-start"
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Bot data-icon="inline-start" aria-hidden="true" />
            )}
            {authorizeAgentRun.isPending ? "正在授权…" : "确认授权"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
