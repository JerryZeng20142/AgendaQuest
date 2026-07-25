import { useState, type FormEvent } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { KeyRound, Loader2, RefreshCw, Server } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

import { useAgendaApi } from "@/api/api-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
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
import { SettingsSection } from "@/features/settings/settings-section"
import type {
  ApiModelOption,
  ApiSettings as ApiSettingsType,
} from "@/lib/types"

function usesHttps(value: string) {
  try {
    return new URL(value).protocol === "https:"
  } catch {
    return false
  }
}

const endpointSchema = z
  .string()
  .trim()
  .url("请输入完整的 HTTPS Endpoint。")
  .refine(usesHttps, {
    message: "Endpoint 必须使用 HTTPS。",
  })

const apiSettingsSchema = z.object({
  endpoint: endpointSchema,
  model: z
    .string()
    .trim()
    .min(1, "请先读取并选择模型。")
    .max(120, "模型名称不能超过 120 个字符。"),
  apiKey: z.string().optional(),
})

function currentModelOption(value: ApiSettingsType): ApiModelOption[] {
  if (!value.model) return []
  return [{ id: value.model, label: value.model }]
}

export function ApiSettings({ value }: { value: ApiSettingsType }) {
  const api = useAgendaApi()
  const queryClient = useQueryClient()
  const [endpoint, setEndpoint] = useState(value.endpoint)
  const [model, setModel] = useState(value.model)
  const [apiKey, setApiKey] = useState("")
  const [modelOptions, setModelOptions] = useState<ApiModelOption[]>(() =>
    currentModelOption(value)
  )
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [modelsPending, setModelsPending] = useState(false)
  const [savePending, setSavePending] = useState(false)

  const clearDiscoveredModels = () => {
    setModelOptions([])
    setModel("")
    setModelsLoaded(false)
    setErrors((current) => {
      const { model: _model, models: _models, ...remaining } = current
      void _model
      void _models
      return remaining
    })
  }

  const loadModels = async () => {
    const endpointResult = endpointSchema.safeParse(endpoint)
    if (!endpointResult.success) {
      setErrors((current) => ({
        ...current,
        endpoint: endpointResult.error.issues[0]?.message,
      }))
      document.getElementById("api-endpoint")?.focus()
      return
    }

    setErrors((current) => {
      const {
        endpoint: _endpoint,
        model: _model,
        models: _models,
        ...remaining
      } = current
      void _endpoint
      void _model
      void _models
      return remaining
    })
    setModelOptions([])
    setModel("")
    setModelsLoaded(false)
    setModelsPending(true)
    const submittedApiKey = apiKey || undefined

    try {
      const discovered = await api.discoverApiModels({
        endpoint: endpointResult.data,
        apiKey: submittedApiKey,
      })
      const uniqueModels = discovered.filter(
        (option, index, options) =>
          options.findIndex((candidate) => candidate.id === option.id) === index
      )

      setEndpoint(endpointResult.data)
      setModelOptions(uniqueModels)
      setModelsLoaded(true)

      if (uniqueModels.length === 0) {
        setModel("")
        setErrors((current) => ({
          ...current,
          models: "此 Endpoint 未返回可用模型。",
        }))
        return
      }

      setModel("")
    } catch (error) {
      setModel("")
      setModelsLoaded(false)
      setErrors((current) => ({
        ...current,
        models: error instanceof Error ? error.message : "模型列表读取失败。",
      }))
    } finally {
      setModelsPending(false)
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = apiSettingsSchema.safeParse({
      endpoint,
      model,
      apiKey: apiKey || undefined,
    })
    if (!result.success) {
      const nextErrors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        const field = String(issue.path[0])
        if (!nextErrors[field]) nextErrors[field] = issue.message
      })
      setErrors(nextErrors)
      document.getElementById(`api-${Object.keys(nextErrors)[0]}`)?.focus()
      return
    }
    setErrors({})
    setSavePending(true)
    const submittedApiKey = result.data.apiKey
    try {
      await api.saveApiSettings({
        endpoint: result.data.endpoint,
        model: result.data.model,
        apiKeyConfigured: value.apiKeyConfigured,
        apiKey: submittedApiKey,
      })
      await queryClient.invalidateQueries({ queryKey: ["agenda", api.mode] })
      toast.success("AI 接口设置已保存到云端。")
      setApiKey("")
    } catch (error) {
      setErrors({
        request: error instanceof Error ? error.message : "接口设置保存失败。",
      })
    } finally {
      setSavePending(false)
    }
  }

  const disabled = api.mode !== "cloud"

  return (
    <SettingsSection
      title="AI 与 API"
      description="配置兼容的服务地址、访问密钥和模型名称。"
    >
      <form onSubmit={submit} className="max-w-2xl" noValidate>
        <FieldGroup>
          {disabled ? (
            <Alert>
              <Server aria-hidden="true" />
              <AlertTitle>云端服务未连接</AlertTitle>
              <AlertDescription>
                预览模式不会接收或保存 API Key。
              </AlertDescription>
            </Alert>
          ) : null}
          <Field data-invalid={Boolean(errors.endpoint)}>
            <FieldLabel htmlFor="api-endpoint">Endpoint</FieldLabel>
            <Input
              id="api-endpoint"
              name="endpoint"
              type="url"
              inputMode="url"
              value={endpoint}
              onChange={(event) => {
                setEndpoint(event.target.value)
                clearDiscoveredModels()
              }}
              placeholder="https://api.example.com/v1"
              spellCheck={false}
              autoComplete="off"
              disabled={disabled || modelsPending}
            />
            <FieldError>{errors.endpoint}</FieldError>
          </Field>
          <Field data-invalid={Boolean(errors.model || errors.models)}>
            <div className="flex items-center justify-between gap-3">
              <FieldLabel htmlFor="api-model">模型</FieldLabel>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadModels}
                disabled={disabled || modelsPending}
              >
                {modelsPending ? (
                  <Loader2
                    data-icon="inline-start"
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <RefreshCw data-icon="inline-start" aria-hidden="true" />
                )}
                {modelsPending
                  ? "正在读取…"
                  : modelsLoaded
                    ? "刷新列表"
                    : "读取列表"}
              </Button>
            </div>
            <Select
              value={model}
              onValueChange={setModel}
              disabled={disabled || modelsPending || modelOptions.length === 0}
              name="model"
            >
              <SelectTrigger
                id="api-model"
                className="w-full"
                aria-invalid={Boolean(errors.model || errors.models)}
              >
                <SelectValue placeholder="先读取模型列表">
                  {modelOptions.find((option) => option.id === model)?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {modelOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription aria-live="polite">
              {modelsPending
                ? "正在从当前 Endpoint 读取可用模型。"
                : modelsLoaded && modelOptions.length > 0
                  ? `已读取 ${modelOptions.length} 个可用模型，请选择。`
                  : modelOptions.length > 0
                    ? "当前仅显示已保存模型；读取列表后可选择其他模型。"
                    : "模型选项由当前 Endpoint 实时返回。"}
            </FieldDescription>
            <FieldError>{errors.model || errors.models}</FieldError>
          </Field>
          <Field>
            <div className="flex items-center justify-between gap-3">
              <FieldLabel htmlFor="api-key">
                <KeyRound aria-hidden="true" />
                API Key
              </FieldLabel>
              <Badge variant="outline">
                {value.apiKeyConfigured ? "已配置" : "未配置"}
              </Badge>
            </div>
            <Input
              id="api-key"
              name="apiKey"
              type="password"
              value={apiKey}
              onChange={(event) => {
                setApiKey(event.target.value)
                clearDiscoveredModels()
              }}
              placeholder={
                value.apiKeyConfigured
                  ? "留空则保持现有密钥"
                  : "输入新的 API Key…"
              }
              spellCheck={false}
              autoComplete="new-password"
              disabled={disabled || modelsPending}
            />
            <FieldDescription>
              密钥仅提交到云端服务，不写入浏览器存储。
            </FieldDescription>
          </Field>
          <FieldError>{errors.request}</FieldError>
          <Button
            type="submit"
            disabled={disabled || modelsPending || savePending}
          >
            {savePending ? (
              <Loader2
                data-icon="inline-start"
                className="animate-spin"
                aria-hidden="true"
              />
            ) : null}
            {savePending ? "正在保存…" : "保存 API 设置"}
          </Button>
        </FieldGroup>
      </form>
    </SettingsSection>
  )
}
