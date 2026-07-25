import { describe, expect, it, vi } from "vitest"

import { CloudAgendaApi } from "@/api/cloud-agenda-api"
import { HttpClient } from "@/api/http-client"
import type { AgendaTask, AgentRun } from "@/lib/types"

function task(): AgendaTask {
  return {
    id: "task-1",
    recordId: "record-1",
    title: "验证请求",
    nextAction: "检查契约",
    priority: "normal",
    status: "pending",
    steps: [],
    createdAt: new Date().toISOString(),
    postponeCount: 0,
    revision: 1,
  }
}

describe("CloudAgendaApi write contracts", () => {
  it("sends the stable task request ID as an idempotency key", async () => {
    const request = vi.fn(async () => task())
    const api = new CloudAgendaApi({ request } as unknown as HttpClient)
    const input = {
      clientRequestId: "request-123",
      recordId: "record-1",
      title: "验证请求",
      nextAction: "检查契约",
      steps: [],
    }

    await api.createTask(input)

    expect(request).toHaveBeenCalledWith("/tasks", {
      method: "POST",
      body: JSON.stringify(input),
      headers: { "Idempotency-Key": "request-123" },
    })
  })

  it("submits the exact confirmed high-risk action IDs", async () => {
    const now = new Date().toISOString()
    const run: AgentRun = {
      id: "run-1",
      taskId: "task-1",
      risk: "high",
      status: "queued",
      actions: [
        { id: "action-1", label: "发送邮件", status: "pending" },
        { id: "action-2", label: "更新日历", status: "pending" },
      ],
      logs: [{ at: now, message: "已接收授权。" }],
      permissionScope: "current-task",
    }
    const request = vi.fn(async () => run)
    const api = new CloudAgendaApi({ request } as unknown as HttpClient)

    await api.authorizeAgentRun({
      planId: "plan-1",
      confirmationId: "confirmation-1",
      permissionScope: "current-task",
      confirmedActionIds: ["action-1", "action-2"],
    })

    expect(request).toHaveBeenCalledWith("/agent-plans/plan-1/authorize", {
      method: "POST",
      body: JSON.stringify({
        confirmationId: "confirmation-1",
        permissionScope: "current-task",
        confirmedActionIds: ["action-1", "action-2"],
      }),
    })
  })
})
