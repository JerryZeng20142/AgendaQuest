import { describe, expect, it } from "vitest"

import { PreviewAgendaApi } from "@/api/preview-agenda-api"
import type { AgendaSnapshot } from "@/lib/types"

async function createRecord(
  api: PreviewAgendaApi,
  content = "必须先保存的原始内容"
) {
  return api.createRecord({ rawContent: content, source: "测试" })
}

describe("PreviewAgendaApi", () => {
  it("timestamps preview session and capability observations when read", async () => {
    const api = new PreviewAgendaApi()
    const before = Date.now()

    const session = await api.login()
    const snapshot = await api.getSnapshot()
    const after = Date.now()

    expect(Date.parse(session.authenticatedAt)).toBeGreaterThanOrEqual(before)
    expect(Date.parse(session.authenticatedAt)).toBeLessThanOrEqual(after)
    snapshot.capabilities.forEach((capability) => {
      expect(Date.parse(capability.updatedAt)).toBeGreaterThanOrEqual(before)
      expect(Date.parse(capability.updatedAt)).toBeLessThanOrEqual(after)
    })
  })

  it("loads the preview fixture without claiming live advanced services", async () => {
    const api = new PreviewAgendaApi()
    await api.login()

    const snapshot = await api.getSnapshot()

    expect(snapshot.records.length).toBeGreaterThan(0)
    expect(snapshot.tasks.length).toBeGreaterThan(0)
    expect(snapshot.agentRuns).toEqual([])
    expect(snapshot.memories).toEqual([])
    expect(snapshot.weeklyReport.completedTaskIds.length).toBeGreaterThan(0)
    expect(snapshot.weeklyReport.recommendations.length).toBeGreaterThan(0)
    expect(snapshot.weeklySchedule.enabled).toBe(false)
    expect(
      snapshot.capabilities.every((item) => item.state === "unavailable")
    ).toBe(true)
  })

  it("isolates data across logout, login, and API instances", async () => {
    const first = new PreviewAgendaApi()
    await first.login()
    const baselineIds = (await first.getSnapshot()).records.map(
      (record) => record.id
    )
    const created = await createRecord(first)

    const second = new PreviewAgendaApi()
    await second.login()
    expect(
      (await second.getSnapshot()).records.map((record) => record.id)
    ).toEqual(baselineIds)
    expect(
      (await second.getSnapshot()).records.some(
        (record) => record.id === created.id
      )
    ).toBe(false)

    await first.logout()
    await first.login()
    expect(
      (await first.getSnapshot()).records.map((record) => record.id)
    ).toEqual(baselineIds)
  })

  it("does not claim unavailable advanced capabilities can write data", async () => {
    const api = new PreviewAgendaApi()
    await api.login()

    await expect(
      api.saveApiSettings({
        endpoint: "https://example.com",
        model: "model",
        apiKeyConfigured: false,
        apiKey: "secret",
      })
    ).rejects.toThrow("未连接云端密钥服务")
    await expect(
      api.updateMemory({ id: "missing-memory", content: "updated" })
    ).rejects.toThrow("未连接长期记忆服务")
    await expect(api.prepareAgentRun("missing-task")).rejects.toThrow(
      "未连接 Agent 运行时"
    )
  })

  it("does not create an AI run when analysis is unavailable", async () => {
    const api = new PreviewAgendaApi()
    await api.login()
    const created = await createRecord(api)

    await expect(api.requestRecordAnalysis(created.id)).rejects.toThrow(
      "未创建运行记录"
    )

    const stored = (await api.getSnapshot()).records.find(
      (record) => record.id === created.id
    )
    expect(stored?.analysis.runId).toBeUndefined()
    expect(stored?.analysisHistory).toEqual([])
    expect(stored?.status).toBe("needs-review")
  })

  it("creates at most one task per record and makes retries idempotent", async () => {
    const api = new PreviewAgendaApi()
    await api.login()
    const initialTaskCount = (await api.getSnapshot()).tasks.length
    const record = await createRecord(api)
    const input = {
      clientRequestId: "request-1",
      recordId: record.id,
      title: "手工确认任务",
      nextAction: "执行下一步",
      steps: [],
    }

    const first = await api.createTask(input)
    const retried = await api.createTask(input)

    expect(retried.id).toBe(first.id)
    await expect(
      api.createTask({ ...input, title: "复用键但改变内容" })
    ).rejects.toThrow("请求 ID 已用于不同内容")
    await expect(
      api.createTask({ ...input, clientRequestId: "request-2" })
    ).rejects.toThrow("已转换为任务")
    expect((await api.getSnapshot()).tasks).toHaveLength(initialTaskCount + 1)
  })

  it("keeps task commands atomic and revision guarded", async () => {
    const api = new PreviewAgendaApi()
    await api.login()
    const record = await createRecord(api)
    const created = await api.createTask({
      clientRequestId: "atomic-task",
      recordId: record.id,
      title: "验证领域命令",
      nextAction: "运行测试",
      steps: [],
    })

    const started = await api.startTask({
      taskId: created.id,
      revision: created.revision,
    })
    expect(started.status).toBe("in-progress")
    expect(started.startedAt).toBeTruthy()
    await expect(
      api.completeTask({ taskId: created.id, revision: created.revision })
    ).rejects.toThrow("其他位置更新")

    const postponed = await api.postponeTask({
      taskId: started.id,
      revision: started.revision,
      days: 1,
    })
    expect(postponed.postponeCount).toBe(1)

    const completed = await api.completeTask({
      taskId: postponed.id,
      revision: postponed.revision,
    })
    expect(completed.status).toBe("completed")
    expect(completed.completedAt).toBeTruthy()
  })

  it("clears the source record link when a task is permanently deleted", async () => {
    const api = new PreviewAgendaApi()
    await api.login()
    const record = await createRecord(api)
    const created = await api.createTask({
      clientRequestId: "delete-task",
      recordId: record.id,
      title: "即将删除的任务",
      nextAction: "删除",
      steps: [],
    })

    await api.deleteTask(created.id)

    const snapshot = await api.getSnapshot()
    const source = snapshot.records.find((item) => item.id === record.id)
    expect(snapshot.tasks.some((task) => task.id === created.id)).toBe(false)
    expect(source?.taskId).toBeUndefined()
    expect(source?.status).toBe("needs-review")
  })

  it("removes derived data whose evidence is permanently deleted", async () => {
    const api = new PreviewAgendaApi()
    await api.login()
    const record = await createRecord(api)
    const task = await api.createTask({
      clientRequestId: "cascade-task",
      recordId: record.id,
      title: "来源任务",
      nextAction: "执行",
      steps: [],
    })
    const internal = api as unknown as { snapshot: AgendaSnapshot }
    const now = new Date().toISOString()
    internal.snapshot.memories.push({
      id: "derived-memory",
      content: "派生记忆",
      sourceRecordIds: [record.id],
      createdAt: now,
      updatedAt: now,
      status: "active",
    })
    internal.snapshot.weeklyReport.recommendations.push({
      content: "派生建议",
      sourceTaskIds: [task.id],
      sourceRecordIds: [record.id],
    })

    await api.deleteRecord(record.id)

    const snapshot = await api.getSnapshot()
    expect(snapshot.memories).toEqual([])
    expect(
      snapshot.weeklyReport.recommendations.some(
        (recommendation) => recommendation.content === "派生建议"
      )
    ).toBe(false)
    expect(snapshot.tasks.some((item) => item.id === task.id)).toBe(false)
  })
})
