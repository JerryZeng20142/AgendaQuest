import { useState, type FormEvent } from "react"
import { Bell, Loader2, Monitor } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { useAgendaActions } from "@/features/agenda/use-agenda"
import { SettingsSection } from "@/features/settings/settings-section"
import type { ReminderSettings as ReminderSettingsType } from "@/lib/types"

export function ReminderSettings({ value }: { value: ReminderSettingsType }) {
  const { updateReminderSettings } = useAgendaActions()
  const [settings, setSettings] = useState(value)
  const [error, setError] = useState("")

  const toggleChannel = (
    channel: ReminderSettingsType["channels"][number],
    checked: boolean
  ) => {
    setSettings((current) => ({
      ...current,
      channels: checked
        ? [
            ...new Set([
              ...current.channels.filter((item) => item !== "silent"),
              channel,
            ]),
          ]
        : current.channels.filter((item) => item !== channel),
    }))
  }

  const toggleDesktop = async (enabled: boolean) => {
    setError("")
    if (!enabled) {
      setSettings((current) => ({
        ...current,
        desktopNotificationsEnabled: false,
        channels: current.channels.filter((item) => item !== "desktop"),
      }))
      return
    }
    if (!("Notification" in window)) {
      setError("当前浏览器不支持桌面通知。")
      return
    }
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setError("桌面通知权限未获授权，请在浏览器网站设置中允许通知。")
        return
      }
      setSettings((current) => ({
        ...current,
        desktopNotificationsEnabled: true,
        channels: [
          ...new Set([
            ...current.channels.filter((item) => item !== "silent"),
            "desktop" as const,
          ]),
        ],
      }))
    } catch {
      setError("浏览器未能完成通知授权，请稍后重试。")
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    try {
      await updateReminderSettings.mutateAsync(settings)
      toast.success("提醒设置已保存。")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "提醒设置保存失败。")
    }
  }

  return (
    <SettingsSection
      title="提醒规则"
      description="设置默认提醒链路；单个任务仍可在行动页调整。"
    >
      <form onSubmit={submit} className="max-w-2xl">
        <FieldGroup>
          <RadioGroup
            name="reminderMode"
            value={settings.mode}
            onValueChange={(mode) =>
              setSettings((current) => ({
                ...current,
                mode: mode as ReminderSettingsType["mode"],
              }))
            }
          >
            <FieldLabel>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>使用全局规则</FieldTitle>
                  <FieldDescription>
                    所有任务默认使用同一套提醒参数。
                  </FieldDescription>
                </FieldContent>
                <RadioGroupItem value="global" />
              </Field>
            </FieldLabel>
            <FieldLabel>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>按任务设置</FieldTitle>
                  <FieldDescription>
                    每个任务单独决定提醒时间。
                  </FieldDescription>
                </FieldContent>
                <RadioGroupItem value="per-task" />
              </Field>
            </FieldLabel>
          </RadioGroup>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>
                <Monitor aria-hidden="true" />
                桌面通知
              </FieldTitle>
              <FieldDescription>仅在浏览器实际授权后启用。</FieldDescription>
            </FieldContent>
            <Switch
              name="desktopNotificationsEnabled"
              checked={settings.desktopNotificationsEnabled}
              onCheckedChange={(checked) => void toggleDesktop(checked)}
              aria-label="启用桌面通知"
            />
          </Field>
          <FieldLabel>
            <Field orientation="horizontal">
              <Checkbox
                name="inAppNotificationsEnabled"
                checked={settings.channels.includes("in-app")}
                onCheckedChange={(checked) =>
                  toggleChannel("in-app", checked === true)
                }
              />
              <FieldContent>
                <FieldTitle>应用内提醒</FieldTitle>
                <FieldDescription>
                  在 Agenda Quest 中显示提醒。
                </FieldDescription>
              </FieldContent>
            </Field>
          </FieldLabel>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="reminder-cooldown">
                提醒冷却（分钟）
              </FieldLabel>
              <Input
                id="reminder-cooldown"
                name="cooldownMinutes"
                type="number"
                min={5}
                max={1440}
                inputMode="numeric"
                value={settings.cooldownMinutes}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    cooldownMinutes: Number(event.target.value),
                  }))
                }
                autoComplete="off"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="due-warning">提前提醒（小时）</FieldLabel>
              <Input
                id="due-warning"
                name="dueWarningHours"
                type="number"
                min={0}
                max={168}
                inputMode="numeric"
                value={settings.dueWarningHours}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    dueWarningHours: Number(event.target.value),
                  }))
                }
                autoComplete="off"
              />
            </Field>
          </div>
          {error ? (
            <Alert variant="destructive">
              <Bell aria-hidden="true" />
              <AlertTitle>提醒设置未完成</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" disabled={updateReminderSettings.isPending}>
            {updateReminderSettings.isPending ? (
              <Loader2
                data-icon="inline-start"
                className="animate-spin"
                aria-hidden="true"
              />
            ) : null}
            {updateReminderSettings.isPending ? "正在保存…" : "保存提醒设置"}
          </Button>
        </FieldGroup>
      </form>
    </SettingsSection>
  )
}
