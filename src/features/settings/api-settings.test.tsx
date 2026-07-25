import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { AgendaApiProvider } from "@/api/api-context"
import type { AgendaApi } from "@/api/agenda-api"
import { ApiSettings } from "@/features/settings/api-settings"

describe("ApiSettings secret handling", () => {
  it("submits the API Key without retaining it in MutationCache", async () => {
    const user = userEvent.setup()
    const queryClient = new QueryClient()
    const discoverApiModels = vi.fn(async () => [
      { id: "model-1", label: "Model 1" },
    ])
    const saveApiSettings = vi.fn(async () => ({
      endpoint: "https://api.example.com/v1",
      model: "model-1",
      apiKeyConfigured: true,
    }))
    const api = {
      mode: "cloud",
      discoverApiModels,
      saveApiSettings,
    } as unknown as AgendaApi

    render(
      <QueryClientProvider client={queryClient}>
        <AgendaApiProvider api={api}>
          <ApiSettings
            value={{ endpoint: "", model: "", apiKeyConfigured: false }}
          />
        </AgendaApiProvider>
      </QueryClientProvider>
    )

    await user.type(
      screen.getByLabelText("Endpoint"),
      "https://api.example.com/v1"
    )
    await user.type(screen.getByLabelText("API Key"), "SENTINEL_KEY")
    await user.click(screen.getByRole("button", { name: "读取列表" }))
    expect(
      await screen.findByText("已读取 1 个可用模型，请选择。")
    ).toBeInTheDocument()
    await user.click(screen.getByRole("combobox", { name: "模型" }))
    await user.click(await screen.findByRole("option", { name: "Model 1" }))
    await user.click(screen.getByRole("button", { name: "保存 API 设置" }))

    await waitFor(() => expect(saveApiSettings).toHaveBeenCalledTimes(1))
    expect(discoverApiModels).toHaveBeenCalledWith({
      endpoint: "https://api.example.com/v1",
      apiKey: "SENTINEL_KEY",
    })
    expect(saveApiSettings).toHaveBeenCalledWith({
      endpoint: "https://api.example.com/v1",
      model: "model-1",
      apiKeyConfigured: false,
      apiKey: "SENTINEL_KEY",
    })
    expect(queryClient.getMutationCache().getAll()).toEqual([])
    expect(screen.getByLabelText("API Key")).toHaveValue("")
  })
})
