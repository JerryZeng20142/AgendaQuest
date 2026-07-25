import { z } from "zod"

const isoDateTime = z.iso.datetime({ offset: true })

export const sessionSchema = z.object({
  user: z.object({
    id: z.string().min(1),
    email: z.email(),
    displayName: z.string().min(1),
    avatarUrl: z.url().optional(),
    onboardingCompleted: z.boolean(),
    onboardingSettings: z
      .object({
        scenario: z.enum(["work", "study", "personal"]),
        captureShortcut: z.enum(["mod-shift-space", "mod-shift-a"]),
        reminderPreset: z.enum(["gentle", "standard", "focused"]),
      })
      .optional(),
  }),
  authenticatedAt: isoDateTime,
})

export const recordAnalysisSchema = z.object({
  runId: z.string().min(1).optional(),
  requestedAt: isoDateTime,
  completedAt: isoDateTime.optional(),
  status: z.enum(["complete", "queued", "failed", "unavailable"]),
  kind: z.enum(["task", "idea", "reference", "event", "unknown"]).optional(),
  confidence: z.enum(["high", "medium", "low"]).optional(),
  title: z.string().optional(),
  nextAction: z.string().optional(),
  suggestedDueAt: isoDateTime.optional(),
  topics: z.array(z.string()),
  suggestedSteps: z.array(z.string()),
  uncertaintyNote: z.string().optional(),
  failureReason: z.string().optional(),
})

export const recordAttachmentSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  mediaType: z.string(),
  size: z.number().nonnegative(),
  createdAt: isoDateTime,
})

export const agendaRecordSchema = z
  .object({
    id: z.string().min(1),
    rawContent: z.string().min(1).nullable(),
    retainedSummary: z.string().min(1).optional(),
    evidenceState: z.enum(["full", "summary-only", "deleted-by-policy"]),
    source: z.string(),
    createdAt: isoDateTime,
    persistedAt: isoDateTime,
    updatedAt: isoDateTime,
    status: z.enum(["queued", "needs-review", "ready", "archived", "failed"]),
    analysis: recordAnalysisSchema,
    analysisHistory: z.array(recordAnalysisSchema),
    attachments: z.array(recordAttachmentSchema),
    taskId: z.string().optional(),
  })
  .superRefine((record, context) => {
    if (record.evidenceState === "full" && record.rawContent === null) {
      context.addIssue({
        code: "custom",
        path: ["rawContent"],
        message: "Full evidence requires raw content",
      })
    }
    if (record.evidenceState !== "full" && record.rawContent !== null) {
      context.addIssue({
        code: "custom",
        path: ["rawContent"],
        message: "Removed raw evidence must not be returned as raw content",
      })
    }
    if (record.evidenceState === "summary-only" && !record.retainedSummary) {
      context.addIssue({
        code: "custom",
        path: ["retainedSummary"],
        message: "Summary-only evidence requires a retained summary",
      })
    }
    if (
      record.evidenceState === "deleted-by-policy" &&
      record.retainedSummary
    ) {
      context.addIssue({
        code: "custom",
        path: ["retainedSummary"],
        message: "Deleted evidence must not retain a summary",
      })
    }
  })

const taskStepSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  completed: z.boolean(),
})

export const agendaTaskSchema = z.object({
  id: z.string().min(1),
  recordId: z.string().min(1),
  title: z.string(),
  nextAction: z.string(),
  dueAt: isoDateTime.optional(),
  priority: z.enum(["urgent", "normal"]),
  status: z.enum([
    "pending",
    "now",
    "today",
    "upcoming",
    "in-progress",
    "completed",
    "archived",
  ]),
  steps: z.array(taskStepSchema),
  createdAt: isoDateTime,
  startedAt: isoDateTime.optional(),
  completedAt: isoDateTime.optional(),
  archivedAt: isoDateTime.optional(),
  completionSummary: z.string().optional(),
  postponeCount: z.number().int().nonnegative(),
  revision: z.number().int().nonnegative(),
})

export const agentRunSchema = z.object({
  id: z.string().min(1),
  taskId: z.string().min(1),
  risk: z.enum(["low", "medium", "high"]),
  status: z.enum(["queued", "running", "completed", "failed", "cancelled"]),
  actions: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string(),
      status: z.enum(["pending", "running", "completed", "failed"]),
    })
  ),
  logs: z.array(z.object({ at: isoDateTime, message: z.string() })),
  permissionScope: z.string(),
  startedAt: isoDateTime.optional(),
  completedAt: isoDateTime.optional(),
  resultSummary: z.string().optional(),
  failureReason: z.string().optional(),
})

export const agentPlanSchema = z.object({
  id: z.string().min(1),
  confirmationId: z.string().min(1),
  taskId: z.string().min(1),
  risk: z.enum(["low", "medium", "high"]),
  actions: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
    })
  ),
  permissionOptions: z.array(z.enum(["current-task", "current-step"])),
  expiresAt: isoDateTime,
})

export const memoryItemSchema = z.object({
  id: z.string().min(1),
  content: z.string(),
  sourceRecordIds: z.array(z.string()),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  status: z.enum(["active", "deleted"]),
})

export const reminderSettingsSchema = z.object({
  mode: z.enum(["global", "per-task"]),
  channels: z.array(z.enum(["desktop", "in-app", "silent"])),
  cooldownMinutes: z.number().nonnegative(),
  dueWarningHours: z.number().nonnegative(),
  desktopNotificationsEnabled: z.boolean(),
})

export const weeklyScheduleSchema = z.object({
  enabled: z.boolean(),
  weekday: z.string(),
  time: z.string(),
  timezone: z.string(),
  channels: z.array(z.enum(["in-app", "push", "email"])),
})

export const apiSettingsSchema = z.object({
  endpoint: z.string(),
  model: z.string(),
  apiKeyConfigured: z.boolean(),
})

export const apiModelOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
})

export const retentionPolicySchema = z
  .object({
    mode: z.enum(["keep-full", "keep-summary", "delete-after"]),
    deleteAfterDays: z.number().int().positive().optional(),
    updatedAt: isoDateTime,
  })
  .refine(
    (value) => value.mode !== "delete-after" || value.deleteAfterDays,
    "deleteAfterDays is required for delete-after retention"
  )

export const attachmentDownloadSchema = z.object({
  url: z
    .url()
    .refine((value) => new URL(value).protocol === "https:", "HTTPS required"),
  expiresAt: isoDateTime,
})

export const syncStatusSchema = z.object({
  state: z.enum(["synced", "syncing", "offline", "unconfigured", "error"]),
  detail: z.string(),
  lastSyncedAt: isoDateTime.optional(),
})

const capabilitySchema = z.object({
  id: z.enum(["memory", "agent", "screen-analysis"]),
  name: z.string(),
  state: z.enum(["available", "unavailable", "connecting", "error"]),
  detail: z.string(),
  updatedAt: isoDateTime,
})

const weeklyReportSchema = z.object({
  weekOf: isoDateTime,
  completedTaskIds: z.array(z.string()),
  postponedTasks: z.array(
    z.object({
      taskId: z.string(),
      count: z.number().int().nonnegative(),
      recommendation: z.string(),
    })
  ),
  unconvertedRecordIds: z.array(z.string()),
  referenceRecordIds: z.array(z.string()),
  recommendations: z.array(
    z.object({
      content: z.string(),
      sourceTaskIds: z.array(z.string()),
      sourceRecordIds: z.array(z.string()),
    })
  ),
})

export const agendaSnapshotSchema = z.object({
  records: z.array(agendaRecordSchema),
  tasks: z.array(agendaTaskSchema),
  agentRuns: z.array(agentRunSchema),
  memories: z.array(memoryItemSchema),
  reminderSettings: reminderSettingsSchema,
  weeklySchedule: weeklyScheduleSchema,
  apiSettings: apiSettingsSchema,
  retentionPolicy: retentionPolicySchema,
  capabilities: z.array(capabilitySchema),
  syncStatus: syncStatusSchema,
  weeklyReport: weeklyReportSchema,
})

export function parseApiResponse<T>(schema: z.ZodType, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw new Error("云端响应格式不符合客户端契约，请刷新或联系服务管理员。", {
      cause: result.error,
    })
  }
  return result.data as T
}
