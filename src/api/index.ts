import type { AgendaApi } from "@/api/agenda-api"
import { CloudAgendaApi } from "@/api/cloud-agenda-api"
import { HttpClient } from "@/api/http-client"
import { PreviewAgendaApi } from "@/api/preview-agenda-api"

type ApiRuntimeConfiguration =
  | {
      mode: "preview"
      apiBaseUrl: null
      error: null
    }
  | {
      mode: "cloud"
      apiBaseUrl: string
      error: null
    }
  | {
      mode: null
      apiBaseUrl: null
      error: string
    }

interface ApiEnvironment {
  dataMode?: string
  apiBaseUrl?: string
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "")
}

export function resolveApiRuntimeConfiguration({
  dataMode,
  apiBaseUrl,
}: ApiEnvironment): ApiRuntimeConfiguration {
  const mode = dataMode?.trim()
  const normalizedBaseUrl = apiBaseUrl ? normalizeBaseUrl(apiBaseUrl) : ""

  if (mode !== "preview" && mode !== "cloud") {
    return {
      mode: null,
      apiBaseUrl: null,
      error:
        "未正确配置 VITE_DATA_MODE。请明确设为 preview 或 cloud，应用不会自动选择数据来源。",
    }
  }

  if (mode === "preview") {
    if (normalizedBaseUrl) {
      return {
        mode: null,
        apiBaseUrl: null,
        error:
          "VITE_DATA_MODE=preview 与 VITE_API_BASE_URL 同时存在，数据来源不明确。请移除云端地址或切换为 cloud。",
      }
    }

    return { mode, apiBaseUrl: null, error: null }
  }

  if (!normalizedBaseUrl) {
    return {
      mode: null,
      apiBaseUrl: null,
      error:
        "VITE_DATA_MODE=cloud 时必须配置 VITE_API_BASE_URL。应用不会回退到临时预览数据。",
    }
  }

  let parsedBaseUrl: URL
  try {
    parsedBaseUrl = new URL(normalizedBaseUrl)
  } catch {
    return {
      mode: null,
      apiBaseUrl: null,
      error: "VITE_API_BASE_URL 必须是有效的 HTTP 或 HTTPS 地址。",
    }
  }

  if (!["http:", "https:"].includes(parsedBaseUrl.protocol)) {
    return {
      mode: null,
      apiBaseUrl: null,
      error: "VITE_API_BASE_URL 必须是有效的 HTTP 或 HTTPS 地址。",
    }
  }

  return { mode, apiBaseUrl: normalizedBaseUrl, error: null }
}

const apiConfiguration = resolveApiRuntimeConfiguration({
  dataMode: import.meta.env.VITE_DATA_MODE,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
})

export const apiConfigurationError = apiConfiguration.error

// Invalid configurations are stopped by App before any business route is mounted.
export const agendaApi: AgendaApi =
  apiConfiguration.mode === "cloud"
    ? new CloudAgendaApi(new HttpClient(apiConfiguration.apiBaseUrl))
    : new PreviewAgendaApi()
