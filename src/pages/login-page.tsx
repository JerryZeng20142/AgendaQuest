import { useState, type FormEvent } from "react"
import { ArrowRight, Cloud, Loader2 } from "lucide-react"
import { useNavigate } from "react-router"
import { z } from "zod"

import { useAgendaApi } from "@/api/api-context"
import { useSession } from "@/auth/session-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useDocumentTitle } from "@/hooks/use-document-title"

const loginSchema = z.object({
  email: z.email("请输入有效的邮箱地址。"),
  password: z.string().min(8, "密码至少需要 8 个字符。"),
})

export function LoginPage() {
  useDocumentTitle("登录")
  const api = useAgendaApi()
  const { login } = useSession()
  const navigate = useNavigate()
  const [email, setEmail] = useState(
    api.mode === "preview" ? "preview@agenda.quest" : ""
  )
  const [password, setPassword] = useState(
    api.mode === "preview" ? "preview-only" : ""
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [requestError, setRequestError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setRequestError("")
    const result = loginSchema.safeParse({ email, password })
    if (!result.success) {
      const nextErrors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        const field = String(issue.path[0])
        if (!nextErrors[field]) nextErrors[field] = issue.message
      })
      setErrors(nextErrors)
      document.getElementById(Object.keys(nextErrors)[0])?.focus()
      return
    }

    setErrors({})
    setIsSubmitting(true)
    try {
      const session = await login(result.data)
      navigate(session.user.onboardingCompleted ? "/inbox" : "/onboarding", {
        replace: true,
      })
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : "登录未能完成，请稍后重试。"
      )
    } finally {
      if (api.mode === "cloud") setPassword("")
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-svh flex-col bg-muted/30">
      <header className="flex h-14 items-center px-4 md:px-6">
        <div className="flex items-center gap-2 font-semibold" translate="no">
          <img
            src="/logo-icon.png"
            alt=""
            className="size-7"
            width={28}
            height={28}
          />
          Agenda Quest
        </div>
      </header>
      <div className="flex flex-1 justify-center md:items-center md:p-6">
        <Card className="w-full rounded-none ring-0 md:max-w-sm md:rounded-xl md:ring-1">
          <CardHeader>
            <CardTitle>
              <h1 className="text-xl text-pretty">登录你的工作区</h1>
            </CardTitle>
          </CardHeader>
          <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
            <CardContent>
              <FieldGroup>
                {api.mode === "preview" ? (
                  <Alert>
                    <Cloud aria-hidden="true" />
                    <AlertTitle>本地预览模式</AlertTitle>
                    <AlertDescription>
                      当前未配置云端地址，表单仅进入本次预览会话。
                    </AlertDescription>
                  </Alert>
                ) : null}
                <Field data-invalid={Boolean(errors.email)}>
                  <FieldLabel htmlFor="email">邮箱</FieldLabel>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    spellCheck={false}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    placeholder="name@example.com"
                  />
                  <FieldError id="email-error">{errors.email}</FieldError>
                </Field>
                <Field data-invalid={Boolean(errors.password)}>
                  <FieldLabel htmlFor="password">密码</FieldLabel>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={
                      errors.password ? "password-error" : undefined
                    }
                    placeholder="输入你的密码…"
                  />
                  <FieldError id="password-error">{errors.password}</FieldError>
                </Field>
                {requestError ? <FieldError>{requestError}</FieldError> : null}
              </FieldGroup>
            </CardContent>
            <CardFooter className="mt-auto flex-col gap-3">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2
                    data-icon="inline-start"
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <ArrowRight data-icon="inline-start" aria-hidden="true" />
                )}
                {isSubmitting
                  ? "正在登录…"
                  : api.mode === "preview"
                    ? "进入预览"
                    : "登录"}
              </Button>
              <FieldDescription className="text-center">
                云端模式使用安全会话 Cookie，浏览器不会保存访问令牌。
              </FieldDescription>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  )
}
