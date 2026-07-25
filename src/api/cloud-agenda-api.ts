import { HttpClient } from "@/api/http-client"
import {
  agendaRecordSchema,
  agendaSnapshotSchema,
  agendaTaskSchema,
  agentPlanSchema,
  agentRunSchema,
  apiModelOptionSchema,
  apiSettingsSchema,
  attachmentDownloadSchema,
  memoryItemSchema,
  parseApiResponse,
  recordAttachmentSchema,
  reminderSettingsSchema,
  retentionPolicySchema,
  sessionSchema,
  syncStatusSchema,
  weeklyScheduleSchema,
} from "@/api/schemas"
import type { AgendaApi } from "@/api/agenda-api"
import type {
  AgendaRecord,
  AgendaSnapshot,
  AgendaTask,
  AgentPlan,
  AgentRun,
  ApiModelOption,
  ApiSettings,
  AuthorizeAgentRunInput,
  CreateRecordInput,
  CreateTaskInput,
  DiscoverApiModelsInput,
  MemoryItem,
  OnboardingSettings,
  PostponeTaskInput,
  ReminderSettings,
  RetentionPolicy,
  Session,
  SyncStatus,
  TaskCommandInput,
  UpdateMemoryInput,
  UpdateRetentionPolicyInput,
  UpdateTaskDetailsInput,
  WeeklyReportSchedule,
} from "@/lib/types"

export class CloudAgendaApi implements AgendaApi {
  readonly mode = "cloud" as const
  private readonly client: HttpClient

  constructor(client: HttpClient) {
    this.client = client
  }

  subscribeToChanges(onChange: (scope: "agenda" | "sync" | "all") => void) {
    const source = this.client.createEventSource("/events")
    const handleMessage = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as { scope?: unknown }
        if (
          payload.scope === "agenda" ||
          payload.scope === "sync" ||
          payload.scope === "all"
        ) {
          onChange(payload.scope)
        }
      } catch {
        // The periodic query remains the fallback for malformed events.
      }
    }
    source.addEventListener("message", handleMessage)
    return () => {
      source.removeEventListener("message", handleMessage)
      source.close()
    }
  }

  getSession() {
    return this.client
      .request<unknown>("/auth/session")
      .then((data) =>
        parseApiResponse<Session | null>(sessionSchema.nullable(), data)
      )
  }

  login(input: { email: string; password: string }) {
    return this.client
      .request<unknown>("/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      })
      .then((data) => parseApiResponse<Session>(sessionSchema, data))
  }

  logout() {
    return this.client.request<void>("/auth/logout", { method: "POST" })
  }

  completeOnboarding(input: OnboardingSettings) {
    return this.client
      .request<unknown>("/onboarding/complete", {
        method: "POST",
        body: JSON.stringify(input),
      })
      .then((data) => parseApiResponse<Session>(sessionSchema, data))
  }

  getSnapshot() {
    return this.client
      .request<unknown>("/agenda/snapshot")
      .then((data) =>
        parseApiResponse<AgendaSnapshot>(agendaSnapshotSchema, data)
      )
  }

  createRecord(input: CreateRecordInput) {
    return this.client
      .request<unknown>("/records", {
        method: "POST",
        body: JSON.stringify(input),
      })
      .then((data) => parseApiResponse<AgendaRecord>(agendaRecordSchema, data))
  }

  uploadRecordAttachments(recordId: string, attachments: File[]) {
    const body = new FormData()
    attachments.forEach((file) => body.append("attachments", file))
    return this.client
      .request<unknown>(`/records/${recordId}/attachments`, {
        method: "POST",
        body,
      })
      .then((data) =>
        parseApiResponse<import("@/lib/types").RecordAttachment[]>(
          recordAttachmentSchema.array(),
          data
        )
      )
  }

  requestRecordAnalysis(recordId: string) {
    return this.client
      .request<unknown>(`/records/${recordId}/analysis`, { method: "POST" })
      .then((data) => parseApiResponse<AgendaRecord>(agendaRecordSchema, data))
  }

  getAttachmentDownload(recordId: string, attachmentId: string) {
    return this.client
      .request<unknown>(
        `/records/${recordId}/attachments/${attachmentId}/download`,
        { method: "POST" }
      )
      .then((data) =>
        parseApiResponse<{ url: string; expiresAt: string }>(
          attachmentDownloadSchema,
          data
        )
      )
  }

  createTask(input: CreateTaskInput) {
    return this.client
      .request<unknown>("/tasks", {
        method: "POST",
        body: JSON.stringify(input),
        headers: { "Idempotency-Key": input.clientRequestId },
      })
      .then((data) => parseApiResponse<AgendaTask>(agendaTaskSchema, data))
  }

  updateTaskDetails(input: UpdateTaskDetailsInput) {
    return this.client
      .request<unknown>(`/tasks/${input.taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ dueAt: input.dueAt, steps: input.steps }),
        headers: { "If-Match": `"${input.revision}"` },
      })
      .then((data) => parseApiResponse<AgendaTask>(agendaTaskSchema, data))
  }

  private runTaskCommand(
    command: "start" | "postpone" | "complete",
    input: TaskCommandInput | PostponeTaskInput
  ) {
    const body =
      command === "postpone" && "days" in input
        ? { revision: input.revision, days: input.days }
        : { revision: input.revision }
    return this.client
      .request<unknown>(`/tasks/${input.taskId}/commands/${command}`, {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "If-Match": `"${input.revision}"` },
      })
      .then((data) => parseApiResponse<AgendaTask>(agendaTaskSchema, data))
  }

  startTask(input: TaskCommandInput) {
    return this.runTaskCommand("start", input)
  }

  postponeTask(input: PostponeTaskInput) {
    return this.runTaskCommand("postpone", input)
  }

  completeTask(input: TaskCommandInput) {
    return this.runTaskCommand("complete", input)
  }

  archiveTask(taskId: string) {
    return this.client.request<void>(`/tasks/${taskId}/archive`, {
      method: "POST",
    })
  }

  restoreTask(taskId: string) {
    return this.client.request<void>(`/tasks/${taskId}/restore`, {
      method: "POST",
    })
  }

  deleteTask(taskId: string) {
    return this.client.request<void>(`/tasks/${taskId}`, { method: "DELETE" })
  }

  archiveRecord(recordId: string) {
    return this.client.request<void>(`/records/${recordId}/archive`, {
      method: "POST",
    })
  }

  restoreRecord(recordId: string) {
    return this.client.request<void>(`/records/${recordId}/restore`, {
      method: "POST",
    })
  }

  deleteRecord(recordId: string) {
    return this.client.request<void>(`/records/${recordId}`, {
      method: "DELETE",
    })
  }

  prepareAgentRun(taskId: string) {
    return this.client
      .request<unknown>("/agent-plans", {
        method: "POST",
        body: JSON.stringify({ taskId }),
      })
      .then((data) => parseApiResponse<AgentPlan>(agentPlanSchema, data))
  }

  authorizeAgentRun(input: AuthorizeAgentRunInput) {
    return this.client
      .request<unknown>(`/agent-plans/${input.planId}/authorize`, {
        method: "POST",
        body: JSON.stringify({
          confirmationId: input.confirmationId,
          permissionScope: input.permissionScope,
          confirmedActionIds: input.confirmedActionIds,
        }),
      })
      .then((data) => parseApiResponse<AgentRun>(agentRunSchema, data))
  }

  cancelAgentRun(runId: string) {
    return this.client.request<void>(`/agent-runs/${runId}/cancel`, {
      method: "POST",
    })
  }

  updateReminderSettings(input: ReminderSettings) {
    return this.client
      .request<unknown>("/settings/reminders", {
        method: "PUT",
        body: JSON.stringify(input),
      })
      .then((data) =>
        parseApiResponse<ReminderSettings>(reminderSettingsSchema, data)
      )
  }

  updateWeeklySchedule(input: WeeklyReportSchedule) {
    return this.client
      .request<unknown>("/settings/weekly-report", {
        method: "PUT",
        body: JSON.stringify(input),
      })
      .then((data) =>
        parseApiResponse<WeeklyReportSchedule>(weeklyScheduleSchema, data)
      )
  }

  saveApiSettings(input: ApiSettings & { apiKey?: string }) {
    return this.client
      .request<unknown>("/settings/ai", {
        method: "PUT",
        body: JSON.stringify(input),
      })
      .then((data) => parseApiResponse<ApiSettings>(apiSettingsSchema, data))
  }

  discoverApiModels(input: DiscoverApiModelsInput) {
    return this.client
      .request<unknown>("/settings/ai/models", {
        method: "POST",
        body: JSON.stringify(input),
      })
      .then((data) =>
        parseApiResponse<ApiModelOption[]>(apiModelOptionSchema.array(), data)
      )
  }

  updateRetentionPolicy(input: UpdateRetentionPolicyInput) {
    return this.client
      .request<unknown>("/settings/retention", {
        method: "PUT",
        body: JSON.stringify(input),
      })
      .then((data) =>
        parseApiResponse<RetentionPolicy>(retentionPolicySchema, data)
      )
  }

  updateMemory(input: UpdateMemoryInput) {
    return this.client
      .request<unknown>(`/memories/${input.id}`, {
        method: "PUT",
        body: JSON.stringify(input),
      })
      .then((data) => parseApiResponse<MemoryItem>(memoryItemSchema, data))
  }

  deleteMemory(memoryId: string) {
    return this.client.request<void>(`/memories/${memoryId}`, {
      method: "DELETE",
    })
  }

  getSyncStatus() {
    return this.client
      .request<unknown>("/sync/status")
      .then((data) => parseApiResponse<SyncStatus>(syncStatusSchema, data))
  }
}
