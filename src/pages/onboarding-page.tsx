import { useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  Check,
  GraduationCap,
  Home,
  Keyboard,
  Loader2,
} from "lucide-react"
import { useNavigate } from "react-router"

import { useSession } from "@/auth/session-context"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { OnboardingSettings } from "@/lib/types"

const scenarios = [
  {
    value: "work" as const,
    label: "工作项目",
    description: "会议、协作与交付",
    icon: BriefcaseBusiness,
  },
  {
    value: "study" as const,
    label: "学习研究",
    description: "资料、想法与复盘",
    icon: GraduationCap,
  },
  {
    value: "personal" as const,
    label: "个人事务",
    description: "生活安排与长期计划",
    icon: Home,
  },
]

const reminders = [
  {
    value: "gentle" as const,
    label: "轻提醒",
    description: "仅在临近截止时提醒",
  },
  {
    value: "standard" as const,
    label: "标准",
    description: "兼顾及时性与打扰程度",
  },
  {
    value: "focused" as const,
    label: "专注",
    description: "重要事项提前并重复提醒",
  },
]

export function OnboardingPage() {
  const { completeOnboarding } = useSession()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [settings, setSettings] = useState<OnboardingSettings>({
    scenario: "work",
    captureShortcut: "mod-shift-space",
    reminderPreset: "standard",
  })
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const finish = async () => {
    setError("")
    setIsSubmitting(true)
    try {
      await completeOnboarding(settings)
      navigate("/inbox", { replace: true })
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "设置未能保存，请重试。"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-svh items-stretch justify-center bg-muted/30 md:items-center md:p-6">
      <section className="flex w-full max-w-xl flex-col bg-background md:min-h-[34rem] md:rounded-lg md:border">
        <header className="border-b px-4 py-4 md:px-6">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-semibold" translate="no">
              Agenda Quest
            </span>
            <span className="text-muted-foreground tabular-nums">
              {step} / 3
            </span>
          </div>
          <Progress
            value={(step / 3) * 100}
            aria-label={`初始化进度：第 ${step} 步，共 3 步`}
          />
        </header>
        <div className="flex flex-1 flex-col px-4 py-6 md:px-6">
          {step === 1 ? (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-xl font-semibold text-pretty">
                  你主要想管理什么？
                </h1>
              </div>
              <RadioGroup
                value={settings.scenario}
                onValueChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    scenario: value as OnboardingSettings["scenario"],
                  }))
                }
                className="gap-3"
              >
                {scenarios.map((item) => (
                  <FieldLabel key={item.value}>
                    <Field orientation="horizontal">
                      <item.icon
                        className="size-5 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <FieldContent>
                        <FieldTitle>{item.label}</FieldTitle>
                        <FieldDescription>{item.description}</FieldDescription>
                      </FieldContent>
                      <RadioGroupItem
                        value={item.value}
                        aria-label={item.label}
                      />
                    </Field>
                  </FieldLabel>
                ))}
              </RadioGroup>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-xl font-semibold text-pretty">
                  选择网页内随手记录快捷键
                </h1>
              </div>
              <RadioGroup
                value={settings.captureShortcut}
                onValueChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    captureShortcut:
                      value as OnboardingSettings["captureShortcut"],
                  }))
                }
                className="gap-3"
              >
                <FieldLabel>
                  <Field orientation="horizontal">
                    <Keyboard
                      className="size-5 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <FieldContent>
                      <FieldTitle>空格组合</FieldTitle>
                      <KbdGroup>
                        <Kbd>⌘ / Ctrl</Kbd>
                        <span>+</span>
                        <Kbd>Shift</Kbd>
                        <span>+</span>
                        <Kbd>Space</Kbd>
                      </KbdGroup>
                    </FieldContent>
                    <RadioGroupItem
                      value="mod-shift-space"
                      aria-label="空格组合"
                    />
                  </Field>
                </FieldLabel>
                <FieldLabel>
                  <Field orientation="horizontal">
                    <Keyboard
                      className="size-5 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <FieldContent>
                      <FieldTitle>A 键组合</FieldTitle>
                      <KbdGroup>
                        <Kbd>⌘ / Ctrl</Kbd>
                        <span>+</span>
                        <Kbd>Shift</Kbd>
                        <span>+</span>
                        <Kbd>A</Kbd>
                      </KbdGroup>
                    </FieldContent>
                    <RadioGroupItem value="mod-shift-a" aria-label="A 键组合" />
                  </Field>
                </FieldLabel>
              </RadioGroup>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-xl font-semibold text-pretty">
                  设置基础提醒强度
                </h1>
              </div>
              <RadioGroup
                value={settings.reminderPreset}
                onValueChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    reminderPreset:
                      value as OnboardingSettings["reminderPreset"],
                  }))
                }
                className="gap-3"
              >
                {reminders.map((item) => (
                  <FieldLabel key={item.value}>
                    <Field orientation="horizontal">
                      <Bell
                        className="size-5 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <FieldContent>
                        <FieldTitle>{item.label}</FieldTitle>
                        <FieldDescription>{item.description}</FieldDescription>
                      </FieldContent>
                      <RadioGroupItem
                        value={item.value}
                        aria-label={item.label}
                      />
                    </Field>
                  </FieldLabel>
                ))}
              </RadioGroup>
            </div>
          ) : null}

          {error ? (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <footer className="mt-auto flex items-center justify-between border-t pt-4">
            <Button
              variant="ghost"
              onClick={() => setStep((current) => Math.max(1, current - 1))}
              disabled={step === 1 || isSubmitting}
            >
              <ArrowLeft data-icon="inline-start" aria-hidden="true" />
              上一步
            </Button>
            {step < 3 ? (
              <Button
                onClick={() => setStep((current) => Math.min(3, current + 1))}
              >
                下一步
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Button>
            ) : (
              <Button onClick={finish} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2
                    data-icon="inline-start"
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Check data-icon="inline-start" aria-hidden="true" />
                )}
                {isSubmitting ? "正在保存…" : "完成设置"}
              </Button>
            )}
          </footer>
        </div>
      </section>
    </main>
  )
}
