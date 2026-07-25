import { describe, expect, it, vi } from "vitest"

import { saveCapture } from "@/features/capture/save-capture"
import type { AgendaRecord } from "@/lib/types"

function record(): AgendaRecord {
  const at = new Date().toISOString()
  return {
    id: "record-1",
    rawContent: "原始内容",
    evidenceState: "full",
    source: "测试",
    createdAt: at,
    persistedAt: at,
    updatedAt: at,
    status: "queued",
    attachments: [],
    analysisHistory: [],
    analysis: {
      runId: "analysis-1",
      requestedAt: at,
      status: "queued",
      topics: [],
      suggestedSteps: [],
    },
  }
}

describe("saveCapture", () => {
  it("persists raw content before uploading attachments and requesting analysis", async () => {
    const calls: string[] = []
    const api = {
      mode: "cloud" as const,
      createRecord: vi.fn(async () => {
        calls.push("persist")
        return record()
      }),
      uploadRecordAttachments: vi.fn(async () => {
        calls.push("upload")
        return []
      }),
      requestRecordAnalysis: vi.fn(async () => {
        calls.push("analyze")
        return record()
      }),
    }

    const attachment = new File(["image"], "capture.png", { type: "image/png" })
    const result = await saveCapture(api, {
      rawContent: "原始内容",
      source: "测试",
      attachments: [attachment],
    })

    expect(calls).toEqual(["persist", "upload", "analyze"])
    expect(result.warnings).toEqual([])
  })

  it("keeps the persisted record and continues analysis when attachment upload fails", async () => {
    const calls: string[] = []
    const api = {
      mode: "cloud" as const,
      createRecord: vi.fn(async () => {
        calls.push("persist")
        return record()
      }),
      uploadRecordAttachments: vi.fn(async () => {
        calls.push("upload")
        throw new Error("upload failed")
      }),
      requestRecordAnalysis: vi.fn(async () => {
        calls.push("analyze")
        return record()
      }),
    }

    const result = await saveCapture(api, {
      rawContent: "原始内容",
      source: "测试",
      attachments: [new File(["image"], "capture.png")],
    })

    expect(calls).toEqual(["persist", "upload", "analyze"])
    expect(result.record.id).toBe("record-1")
    expect(result.attachmentUploadFailed).toBe(true)
    expect(result.warnings).toContain("原始内容已保存，但附件上传失败。")
  })

  it("does not request AI analysis in preview mode", async () => {
    const analyze = vi.fn(async () => record())
    const api = {
      mode: "preview" as const,
      createRecord: vi.fn(async () => record()),
      uploadRecordAttachments: vi.fn(async () => []),
      requestRecordAnalysis: analyze,
    }

    const result = await saveCapture(api, {
      rawContent: "原始内容",
      source: "测试",
      attachments: [],
    })

    expect(analyze).not.toHaveBeenCalled()
    expect(result.analysisRequestFailed).toBe(true)
    expect(result.warnings).toContain("原始内容已保存，但 AI 处理暂未启动。")
  })
})
