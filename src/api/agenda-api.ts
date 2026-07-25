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

export interface AgendaApi {
  readonly mode: "cloud" | "preview"
  subscribeToChanges(
    onChange: (scope: "agenda" | "sync" | "all") => void
  ): () => void
  getSession(): Promise<Session | null>
  login(input: { email: string; password: string }): Promise<Session>
  logout(): Promise<void>
  completeOnboarding(input: OnboardingSettings): Promise<Session>
  getSnapshot(): Promise<AgendaSnapshot>
  createRecord(input: CreateRecordInput): Promise<AgendaRecord>
  uploadRecordAttachments(
    recordId: string,
    attachments: File[]
  ): Promise<import("@/lib/types").RecordAttachment[]>
  requestRecordAnalysis(recordId: string): Promise<AgendaRecord>
  getAttachmentDownload(
    recordId: string,
    attachmentId: string
  ): Promise<{ url: string; expiresAt: string }>
  createTask(input: CreateTaskInput): Promise<AgendaTask>
  updateTaskDetails(input: UpdateTaskDetailsInput): Promise<AgendaTask>
  startTask(input: TaskCommandInput): Promise<AgendaTask>
  postponeTask(input: PostponeTaskInput): Promise<AgendaTask>
  completeTask(input: TaskCommandInput): Promise<AgendaTask>
  archiveTask(taskId: string): Promise<void>
  restoreTask(taskId: string): Promise<void>
  deleteTask(taskId: string): Promise<void>
  archiveRecord(recordId: string): Promise<void>
  restoreRecord(recordId: string): Promise<void>
  deleteRecord(recordId: string): Promise<void>
  prepareAgentRun(taskId: string): Promise<AgentPlan>
  authorizeAgentRun(input: AuthorizeAgentRunInput): Promise<AgentRun>
  cancelAgentRun(runId: string): Promise<void>
  updateReminderSettings(input: ReminderSettings): Promise<ReminderSettings>
  updateWeeklySchedule(
    input: WeeklyReportSchedule
  ): Promise<WeeklyReportSchedule>
  saveApiSettings(
    input: ApiSettings & { apiKey?: string }
  ): Promise<ApiSettings>
  discoverApiModels(input: DiscoverApiModelsInput): Promise<ApiModelOption[]>
  updateRetentionPolicy(
    input: UpdateRetentionPolicyInput
  ): Promise<RetentionPolicy>
  updateMemory(input: UpdateMemoryInput): Promise<MemoryItem>
  deleteMemory(memoryId: string): Promise<void>
  getSyncStatus(): Promise<SyncStatus>
}
