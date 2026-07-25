import { describe, expect, it } from "vitest"

import {
  groupInboxItems,
  matchesFlow,
  sortInboxItems,
  type InboxRecordItem,
} from "@/features/records/inbox-organization"
import { createMockAgendaSnapshot } from "@/mocks/preview-agenda.mock"

const now = new Date("2026-07-25T12:00:00.000Z")

function createItems(): InboxRecordItem[] {
  const snapshot = createMockAgendaSnapshot(now, "Asia/Shanghai")
  const tasksById = new Map(snapshot.tasks.map((task) => [task.id, task]))
  return snapshot.records
    .filter((record) => record.status !== "archived")
    .map((record) => ({
      record,
      task: record.taskId ? tasksById.get(record.taskId) : undefined,
    }))
}

describe("inbox organization", () => {
  it("filters records by whether they have flowed into a task", () => {
    const records = createItems().map((item) => item.record)

    expect(
      records.filter((record) => matchesFlow(record, "flowed"))
    ).toHaveLength(3)
    expect(
      records.filter((record) => matchesFlow(record, "unflowed"))
    ).toHaveLength(2)
  })

  it("sorts imminent deadlines first and missing deadlines last", () => {
    const sorted = sortInboxItems(createItems(), "dueAt")

    expect(sorted.slice(0, 2).map((item) => item.record.id)).toEqual([
      "mock-record-product-review",
      "mock-record-research",
    ])
    expect(sorted.at(-1)?.record.analysis.suggestedDueAt).toBeUndefined()
  })

  it("sorts started tasks before records without a start time", () => {
    const sorted = sortInboxItems(createItems(), "startedAt")

    expect(sorted[0]?.record.id).toBe("mock-record-release-notes")
    expect(sorted.slice(1).every((item) => !item.task?.startedAt)).toBe(true)
  })

  it("groups records using visible record attributes", () => {
    const byFlow = groupInboxItems(createItems(), "flow")
    const byKind = groupInboxItems(createItems(), "kind")

    expect(byFlow.map((group) => [group.label, group.items.length])).toEqual([
      ["已流转", 3],
      ["未流转", 2],
    ])
    expect(byKind.map((group) => group.label)).toEqual([
      "日程",
      "想法",
      "任务",
      "资料",
    ])
  })
})
