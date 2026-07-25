import { describe, expect, it } from "vitest"

import { resolveApiRuntimeConfiguration } from "@/api"

describe("API runtime configuration", () => {
  it("requires an explicit data mode", () => {
    expect(resolveApiRuntimeConfiguration({})).toMatchObject({
      mode: null,
      error: expect.stringContaining("VITE_DATA_MODE"),
    })
  })

  it("rejects unsupported data modes", () => {
    expect(
      resolveApiRuntimeConfiguration({ dataMode: "automatic" })
    ).toMatchObject({
      mode: null,
      error: expect.stringContaining("preview 或 cloud"),
    })
  })

  it("selects preview only when cloud configuration is absent", () => {
    expect(resolveApiRuntimeConfiguration({ dataMode: "preview" })).toEqual({
      mode: "preview",
      apiBaseUrl: null,
      error: null,
    })

    expect(
      resolveApiRuntimeConfiguration({
        dataMode: "preview",
        apiBaseUrl: "https://api.example.com",
      })
    ).toMatchObject({
      mode: null,
      error: expect.stringContaining("数据来源不明确"),
    })
  })

  it("requires a valid HTTP API URL in cloud mode", () => {
    expect(resolveApiRuntimeConfiguration({ dataMode: "cloud" })).toMatchObject(
      {
        mode: null,
        error: expect.stringContaining("VITE_API_BASE_URL"),
      }
    )

    expect(
      resolveApiRuntimeConfiguration({
        dataMode: "cloud",
        apiBaseUrl: "file:///tmp/agenda",
      })
    ).toMatchObject({
      mode: null,
      error: expect.stringContaining("HTTP 或 HTTPS"),
    })
  })

  it("selects cloud mode and normalizes trailing slashes", () => {
    expect(
      resolveApiRuntimeConfiguration({
        dataMode: " cloud ",
        apiBaseUrl: " https://api.example.com/v1/// ",
      })
    ).toEqual({
      mode: "cloud",
      apiBaseUrl: "https://api.example.com/v1",
      error: null,
    })
  })
})
