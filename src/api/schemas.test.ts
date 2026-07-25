import { describe, expect, it } from "vitest"

import {
  agentPlanSchema,
  agendaRecordSchema,
  parseApiResponse,
  sessionSchema,
} from "@/api/schemas"
import type { Session } from "@/lib/types"

describe("API response schemas", () => {
  const recordFixture = {
    id: "record-1",
    source: "测试",
    createdAt: new Date().toISOString(),
    persistedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "needs-review",
    attachments: [],
    analysis: {
      requestedAt: new Date().toISOString(),
      status: "unavailable",
      topics: [],
      suggestedSteps: [],
    },
    analysisHistory: [],
  }

  it("rejects a session missing cloud onboarding state", () => {
    expect(() =>
      parseApiResponse<Session>(sessionSchema, {
        user: { id: "1", email: "user@example.com", displayName: "User" },
        authenticatedAt: new Date().toISOString(),
      })
    ).toThrow("云端响应格式不符合客户端契约")
  })

  it.each(["2026-02-30T10:00:00+08:00", "next Friday", "2026-07-25T10:00:00"])(
    "rejects invalid or offset-free datetimes: %s",
    (authenticatedAt) => {
      expect(() =>
        parseApiResponse<Session>(sessionSchema, {
          user: {
            id: "1",
            email: "user@example.com",
            displayName: "User",
            onboardingCompleted: true,
          },
          authenticatedAt,
        })
      ).toThrow("云端响应格式不符合客户端契约")
    }
  )

  it("applies strict datetime validation throughout record history", () => {
    expect(() =>
      agendaRecordSchema.parse({
        id: "record-1",
        rawContent: "原始记录",
        evidenceState: "full",
        source: "测试",
        createdAt: new Date().toISOString(),
        persistedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "failed",
        attachments: [],
        analysis: {
          requestedAt: "not-a-date",
          status: "failed",
          topics: [],
          suggestedSteps: [],
        },
        analysisHistory: [],
      })
    ).toThrow()
  })

  it.each([
    {
      name: "完整证据包含原文",
      evidenceState: "full",
      rawContent: "原始记录",
      retainedSummary: undefined,
      valid: true,
    },
    {
      name: "摘要证据只保留摘要",
      evidenceState: "summary-only",
      rawContent: null,
      retainedSummary: "保留摘要",
      valid: true,
    },
    {
      name: "按策略删除后不保留原文或摘要",
      evidenceState: "deleted-by-policy",
      rawContent: null,
      retainedSummary: undefined,
      valid: true,
    },
    {
      name: "完整证据缺少原文",
      evidenceState: "full",
      rawContent: null,
      retainedSummary: undefined,
      valid: false,
    },
    {
      name: "摘要证据缺少摘要",
      evidenceState: "summary-only",
      rawContent: null,
      retainedSummary: undefined,
      valid: false,
    },
    {
      name: "摘要证据仍返回原文",
      evidenceState: "summary-only",
      rawContent: "不应返回的原文",
      retainedSummary: "保留摘要",
      valid: false,
    },
    {
      name: "已删除证据仍返回摘要",
      evidenceState: "deleted-by-policy",
      rawContent: null,
      retainedSummary: "不应返回的摘要",
      valid: false,
    },
  ])("enforces evidence fields: $name", (testCase) => {
    const result = agendaRecordSchema.safeParse({
      ...recordFixture,
      evidenceState: testCase.evidenceState,
      rawContent: testCase.rawContent,
      retainedSummary: testCase.retainedSummary,
    })

    expect(result.success).toBe(testCase.valid)
  })

  it("requires an authorization confirmation ID in Agent plans", () => {
    const result = agentPlanSchema.safeParse({
      id: "plan-1",
      confirmationId: "",
      taskId: "task-1",
      risk: "high",
      actions: [{ id: "action-1", label: "发送消息" }],
      permissionOptions: ["current-task"],
      expiresAt: new Date().toISOString(),
    })

    expect(result.success).toBe(false)
  })
})
