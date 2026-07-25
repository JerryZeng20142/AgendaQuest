import { useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useAgendaActions } from "@/features/agenda/use-agenda"
import { SettingsSection } from "@/features/settings/settings-section"
import type { WeeklyReportSchedule } from "@/lib/types"

const weekdays = [
  "星期一",
  "星期二",
  "星期三",
  "星期四",
  "星期五",
  "星期六",
  "星期日",
]

export function WeeklySettings({ value }: { value: WeeklyReportSchedule }) {
  const { updateWeeklySchedule } = useAgendaActions()
  const [settings, setSettings] = useState(value)
  const [error, setError] = useState("")

  const toggleChannel = (
    channel: WeeklyReportSchedule["channels"][number],
    checked: boolean
  ) => {
    setSettings((current) => ({
      ...current,
      channels: checked
        ? [...new Set([...current.channels, channel])]
        : current.channels.filter((item) => item !== channel),
    }))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    try {
      await updateWeeklySchedule.mutateAsync(settings)
      toast.success("周报推送计划已保存。")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "周报计划保存失败。")
    }
  }

  return (
    <SettingsSection
      title="产品行为周报"
      description="设置每周固定生成和推送时间。"
    >
      <form onSubmit={submit} className="max-w-2xl">
        <FieldGroup>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>启用每周复盘</FieldTitle>
              <FieldDescription>按所选时区生成本周报告。</FieldDescription>
            </FieldContent>
            <Switch
              name="weeklyReportEnabled"
              checked={settings.enabled}
              onCheckedChange={(enabled) =>
                setSettings((current) => ({ ...current, enabled }))
              }
              aria-label="启用每周复盘"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="weekly-day">推送日</FieldLabel>
              <Select
                value={settings.weekday}
                onValueChange={(weekday) =>
                  setSettings((current) => ({ ...current, weekday }))
                }
                disabled={!settings.enabled}
              >
                <SelectTrigger id="weekly-day" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {weekdays.map((day) => (
                      <SelectItem key={day} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="weekly-time">推送时间</FieldLabel>
              <Input
                id="weekly-time"
                name="weeklyTime"
                type="time"
                value={settings.time}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    time: event.target.value,
                  }))
                }
                disabled={!settings.enabled}
                autoComplete="off"
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="weekly-timezone">时区</FieldLabel>
            <Input
              id="weekly-timezone"
              name="timezone"
              value={settings.timezone}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  timezone: event.target.value,
                }))
              }
              disabled={!settings.enabled}
              spellCheck={false}
              autoComplete="off"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            {(["in-app", "push", "email"] as const).map((channel) => (
              <FieldLabel key={channel}>
                <Field orientation="horizontal">
                  <Checkbox
                    name={`weeklyChannel-${channel}`}
                    checked={settings.channels.includes(channel)}
                    onCheckedChange={(checked) =>
                      toggleChannel(channel, checked === true)
                    }
                    disabled={!settings.enabled}
                  />
                  <FieldTitle>
                    {channel === "in-app"
                      ? "应用内"
                      : channel === "push"
                        ? "推送"
                        : "邮件"}
                  </FieldTitle>
                </Field>
              </FieldLabel>
            ))}
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={updateWeeklySchedule.isPending}>
            {updateWeeklySchedule.isPending ? (
              <Loader2
                data-icon="inline-start"
                className="animate-spin"
                aria-hidden="true"
              />
            ) : null}
            {updateWeeklySchedule.isPending ? "正在保存…" : "保存周报计划"}
          </Button>
        </FieldGroup>
      </form>
    </SettingsSection>
  )
}
