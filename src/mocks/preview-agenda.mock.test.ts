import { describe, expect, it } from "vitest"

import { agendaSnapshotSchema, sessionSchema } from "@/api/schemas"
import {
  createMockAgendaSnapshot,
  createMockPreviewSession,
} from "@/mocks/preview-agenda.mock"

describe("preview agenda mock", () => {
  it("matches the API response contracts", () => {
    const now = new Date("2026-07-25T12:00:00.000Z")

    expect(() =>
      sessionSchema.parse(createMockPreviewSession(now))
    ).not.toThrow()
    expect(() =>
      agendaSnapshotSchema.parse(createMockAgendaSnapshot(now, "Asia/Shanghai"))
    ).not.toThrow()
  })

  it("keeps report and task references connected to source data", () => {
    const snapshot = createMockAgendaSnapshot(
      new Date("2026-07-25T12:00:00.000Z"),
      "Asia/Shanghai"
    )
    const recordIds = new Set(snapshot.records.map((record) => record.id))
    const taskIds = new Set(snapshot.tasks.map((task) => task.id))

    snapshot.tasks.forEach((task) => {
      expect(recordIds.has(task.recordId)).toBe(true)
    })
    snapshot.records.forEach((record) => {
      if (record.taskId) expect(taskIds.has(record.taskId)).toBe(true)
    })
    snapshot.weeklyReport.completedTaskIds.forEach((taskId) => {
      expect(taskIds.has(taskId)).toBe(true)
    })
    snapshot.weeklyReport.postponedTasks.forEach(({ taskId }) => {
      expect(taskIds.has(taskId)).toBe(true)
    })
    const reportRecordIds = [
      ...snapshot.weeklyReport.unconvertedRecordIds,
      ...snapshot.weeklyReport.referenceRecordIds,
    ]
    reportRecordIds.forEach((recordId) => {
      expect(recordIds.has(recordId)).toBe(true)
    })
  })
})
