import type { AgendaApi } from "@/api/agenda-api"
import type { CreateRecordInput } from "@/lib/types"

type CaptureApi = Pick<
  AgendaApi,
  "mode" | "createRecord" | "uploadRecordAttachments" | "requestRecordAnalysis"
>

export interface SaveCaptureInput extends CreateRecordInput {
  attachments: File[]
}

export async function saveCapture(api: CaptureApi, input: SaveCaptureInput) {
  const record = await api.createRecord({
    rawContent: input.rawContent,
    source: input.source,
  })
  const warnings: string[] = []
  let attachmentUploadFailed = false
  let analysisRequestFailed = false

  if (input.attachments.length) {
    try {
      await api.uploadRecordAttachments(record.id, input.attachments)
    } catch {
      attachmentUploadFailed = true
      warnings.push("原始内容已保存，但附件上传失败。")
    }
  }

  if (api.mode === "preview") {
    analysisRequestFailed = true
    warnings.push("原始内容已保存，但 AI 处理暂未启动。")
  } else {
    try {
      await api.requestRecordAnalysis(record.id)
    } catch {
      analysisRequestFailed = true
      warnings.push("原始内容已保存，但 AI 处理暂未启动。")
    }
  }

  return {
    record,
    warnings,
    attachmentUploadFailed,
    analysisRequestFailed,
  }
}
