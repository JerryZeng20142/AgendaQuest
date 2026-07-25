export type IsoDateTime = string

export type RecordKind = "task" | "idea" | "reference" | "event" | "unknown"
export type RecordStatus =
  "queued" | "needs-review" | "ready" | "archived" | "failed"
export type TaskPriority = "urgent" | "normal"
export type TaskStatus =
  | "pending"
  | "now"
  | "today"
  | "upcoming"
  | "in-progress"
  | "completed"
  | "archived"
export type CapabilityState =
  "available" | "unavailable" | "connecting" | "error"
export type EvidenceState = "full" | "summary-only" | "deleted-by-policy"

export interface SessionUser {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
  onboardingCompleted: boolean
  onboardingSettings?: OnboardingSettings
}

export interface Session {
  user: SessionUser
  authenticatedAt: IsoDateTime
}

export interface RecordAnalysis {
  runId?: string
  requestedAt: IsoDateTime
  completedAt?: IsoDateTime
  status: "complete" | "queued" | "failed" | "unavailable"
  kind?: RecordKind
  confidence?: "high" | "medium" | "low"
  title?: string
  nextAction?: string
  suggestedDueAt?: IsoDateTime
  topics: string[]
  suggestedSteps: string[]
  uncertaintyNote?: string
  failureReason?: string
}

export interface RecordAttachment {
  id: string
  name: string
  mediaType: string
  size: number
  createdAt: IsoDateTime
}

export interface AgendaRecord {
  id: string
  rawContent: string | null
  retainedSummary?: string
  evidenceState: EvidenceState
  source: string
  createdAt: IsoDateTime
  persistedAt: IsoDateTime
  updatedAt: IsoDateTime
  status: RecordStatus
  analysis: RecordAnalysis
  analysisHistory: RecordAnalysis[]
  attachments: RecordAttachment[]
  taskId?: string
}

export interface TaskStep {
  id: string
  label: string
  completed: boolean
}

export interface AgendaTask {
  id: string
  recordId: string
  title: string
  nextAction: string
  dueAt?: IsoDateTime
  priority: TaskPriority
  status: TaskStatus
  steps: TaskStep[]
  createdAt: IsoDateTime
  completedAt?: IsoDateTime
  archivedAt?: IsoDateTime
  completionSummary?: string
  postponeCount: number
  revision: number
}

export interface AgentRun {
  id: string
  taskId: string
  risk: "low" | "medium" | "high"
  status: "queued" | "running" | "completed" | "failed" | "cancelled"
  actions: Array<{
    id: string
    label: string
    status: "pending" | "running" | "completed" | "failed"
  }>
  logs: Array<{ at: IsoDateTime; message: string }>
  permissionScope: string
  startedAt?: IsoDateTime
  completedAt?: IsoDateTime
  resultSummary?: string
  failureReason?: string
}

export interface AgentPlan {
  id: string
  confirmationId: string
  taskId: string
  risk: "low" | "medium" | "high"
  actions: Array<{
    id: string
    label: string
  }>
  permissionOptions: Array<"current-task" | "current-step">
  expiresAt: IsoDateTime
}

export interface MemoryItem {
  id: string
  content: string
  sourceRecordIds: string[]
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
  status: "active" | "deleted"
}

export interface ReminderSettings {
  mode: "global" | "per-task"
  channels: Array<"desktop" | "in-app" | "silent">
  cooldownMinutes: number
  dueWarningHours: number
  desktopNotificationsEnabled: boolean
}

export interface WeeklyReportSchedule {
  enabled: boolean
  weekday: string
  time: string
  timezone: string
  channels: Array<"in-app" | "push" | "email">
}

export interface OnboardingSettings {
  scenario: "work" | "study" | "personal"
  captureShortcut: "mod-shift-space" | "mod-shift-a"
  reminderPreset: "gentle" | "standard" | "focused"
}

export interface ApiSettings {
  endpoint: string
  model: string
  apiKeyConfigured: boolean
}

export interface ApiModelOption {
  id: string
  label: string
}

export interface RetentionPolicy {
  mode: "keep-full" | "keep-summary" | "delete-after"
  deleteAfterDays?: number
  updatedAt: IsoDateTime
}

export type UpdateRetentionPolicyInput = Omit<RetentionPolicy, "updatedAt">

export interface Capability {
  id: "memory" | "agent" | "screen-analysis"
  name: string
  state: CapabilityState
  detail: string
  updatedAt: IsoDateTime
}

export interface SyncStatus {
  state: "synced" | "syncing" | "offline" | "unconfigured" | "error"
  detail: string
  lastSyncedAt?: IsoDateTime
}

export interface WeeklyReport {
  weekOf: IsoDateTime
  completedTaskIds: string[]
  postponedTasks: Array<{
    taskId: string
    count: number
    recommendation: string
  }>
  unconvertedRecordIds: string[]
  referenceRecordIds: string[]
  recommendations: Array<{
    content: string
    sourceTaskIds: string[]
    sourceRecordIds: string[]
  }>
}

export interface AgendaSnapshot {
  records: AgendaRecord[]
  tasks: AgendaTask[]
  agentRuns: AgentRun[]
  memories: MemoryItem[]
  reminderSettings: ReminderSettings
  weeklySchedule: WeeklyReportSchedule
  apiSettings: ApiSettings
  retentionPolicy: RetentionPolicy
  capabilities: Capability[]
  syncStatus: SyncStatus
  weeklyReport: WeeklyReport
}

export interface CreateRecordInput {
  rawContent: string
  source: string
}

export interface CreateTaskInput {
  clientRequestId: string
  recordId: string
  title: string
  nextAction: string
  dueAt?: IsoDateTime
  steps: string[]
}

export interface TaskCommandInput {
  taskId: string
  revision: number
}

export interface UpdateTaskDetailsInput extends TaskCommandInput {
  dueAt?: IsoDateTime
  steps: TaskStep[]
}

export interface PostponeTaskInput extends TaskCommandInput {
  days: number
}

export interface DiscoverApiModelsInput {
  endpoint: string
  apiKey?: string
}

export interface UpdateMemoryInput {
  id: string
  content: string
}

export interface AuthorizeAgentRunInput {
  planId: string
  confirmationId: string
  permissionScope: "current-task" | "current-step"
  confirmedActionIds: string[]
}
