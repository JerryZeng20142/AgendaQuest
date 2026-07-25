from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Literal
from datetime import datetime


# Auth schemas
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    displayName: str
    avatarUrl: Optional[str] = None
    onboardingCompleted: bool
    onboardingSettings: Optional[dict] = None


class SessionResponse(BaseModel):
    user: UserResponse
    authenticatedAt: str


class OnboardingRequest(BaseModel):
    scenario: Literal["work", "study", "personal"]
    captureShortcut: Literal["mod-shift-space", "mod-shift-a"]
    reminderPreset: Literal["gentle", "standard", "focused"]


# Record schemas
class RecordAnalysis(BaseModel):
    runId: Optional[str] = None
    requestedAt: str
    completedAt: Optional[str] = None
    status: Literal["complete", "queued", "failed", "unavailable"]
    kind: Optional[Literal["task", "idea", "reference", "event", "unknown"]] = None
    confidence: Optional[Literal["high", "medium", "low"]] = None
    title: Optional[str] = None
    nextAction: Optional[str] = None
    suggestedDueAt: Optional[str] = None
    topics: List[str] = []
    suggestedSteps: List[str] = []
    uncertaintyNote: Optional[str] = None
    failureReason: Optional[str] = None


class RecordAttachment(BaseModel):
    id: str
    name: str
    mediaType: str
    size: int
    createdAt: str


class AgendaRecord(BaseModel):
    id: str
    rawContent: Optional[str] = None
    retainedSummary: Optional[str] = None
    evidenceState: Literal["full", "summary-only", "deleted-by-policy"]
    source: str
    createdAt: str
    persistedAt: str
    updatedAt: str
    status: Literal["queued", "needs-review", "ready", "archived", "failed"]
    analysis: RecordAnalysis
    analysisHistory: List[RecordAnalysis] = []
    attachments: List[RecordAttachment] = []
    taskId: Optional[str] = None


class CreateRecordRequest(BaseModel):
    rawContent: str
    source: str


# Task schemas
class TaskStep(BaseModel):
    id: str
    label: str
    completed: bool


class AgendaTask(BaseModel):
    id: str
    recordId: str
    title: str
    nextAction: str
    dueAt: Optional[str] = None
    priority: Literal["urgent", "normal"]
    status: Literal["pending", "now", "today", "upcoming", "in-progress", "completed", "archived"]
    steps: List[TaskStep] = []
    createdAt: str
    startedAt: Optional[str] = None
    completedAt: Optional[str] = None
    archivedAt: Optional[str] = None
    completionSummary: Optional[str] = None
    postponeCount: int = 0
    revision: int


class CreateTaskRequest(BaseModel):
    recordId: str
    title: str
    nextAction: str
    dueAt: Optional[str] = None
    steps: List[str] = []


class UpdateTaskRequest(BaseModel):
    dueAt: Optional[str] = None
    steps: List[TaskStep] = []


class TaskCommandRequest(BaseModel):
    revision: int


class PostponeTaskRequest(TaskCommandRequest):
    days: int


# Memory schemas
class MemoryItem(BaseModel):
    id: str
    content: str
    sourceRecordIds: List[str] = []
    createdAt: str
    updatedAt: str
    status: Literal["active", "deleted"]


class UpdateMemoryRequest(BaseModel):
    content: str


# Settings schemas
class ReminderSettings(BaseModel):
    mode: Literal["global", "per-task"]
    channels: List[Literal["desktop", "in-app", "silent"]]
    cooldownMinutes: int
    dueWarningHours: int
    desktopNotificationsEnabled: bool


class WeeklySchedule(BaseModel):
    enabled: bool
    weekday: str
    time: str
    timezone: str
    channels: List[Literal["in-app", "push", "email"]]


class ApiSettings(BaseModel):
    endpoint: str
    model: str
    apiKeyConfigured: bool


class SaveApiSettingsRequest(BaseModel):
    endpoint: str
    model: str
    apiKey: Optional[str] = None


class ApiModelOption(BaseModel):
    id: str
    label: str


class DiscoverApiModelsRequest(BaseModel):
    endpoint: str
    apiKey: Optional[str] = None


class RetentionPolicy(BaseModel):
    mode: Literal["keep-full", "keep-summary", "delete-after"]
    deleteAfterDays: Optional[int] = None
    updatedAt: str


class UpdateRetentionPolicyRequest(BaseModel):
    mode: Literal["keep-full", "keep-summary", "delete-after"]
    deleteAfterDays: Optional[int] = None


# Agent schemas
class AgentAction(BaseModel):
    id: str
    label: str
    status: Optional[Literal["pending", "running", "completed", "failed"]] = None


class AgentRun(BaseModel):
    id: str
    taskId: str
    risk: Literal["low", "medium", "high"]
    status: Literal["queued", "running", "completed", "failed", "cancelled"]
    actions: List[AgentAction] = []
    logs: List[dict] = []
    permissionScope: str
    startedAt: Optional[str] = None
    completedAt: Optional[str] = None
    resultSummary: Optional[str] = None
    failureReason: Optional[str] = None


class AgentPlan(BaseModel):
    id: str
    confirmationId: str
    taskId: str
    risk: Literal["low", "medium", "high"]
    actions: List[dict] = []
    permissionOptions: List[Literal["current-task", "current-step"]]
    expiresAt: str


class PrepareAgentRunRequest(BaseModel):
    taskId: str


class AuthorizeAgentRunRequest(BaseModel):
    confirmationId: str
    permissionScope: Literal["current-task", "current-step"]
    confirmedActionIds: List[str]


# Snapshot schemas
class Capability(BaseModel):
    id: Literal["memory", "agent", "screen-analysis"]
    name: str
    state: Literal["available", "unavailable", "connecting", "error"]
    detail: str
    updatedAt: str


class SyncStatus(BaseModel):
    state: Literal["synced", "syncing", "offline", "unconfigured", "error"]
    detail: str
    lastSyncedAt: Optional[str] = None


class WeeklyReport(BaseModel):
    weekOf: str
    completedTaskIds: List[str] = []
    postponedTasks: List[dict] = []
    unconvertedRecordIds: List[str] = []
    referenceRecordIds: List[str] = []
    recommendations: List[dict] = []


class AgendaSnapshot(BaseModel):
    records: List[AgendaRecord]
    tasks: List[AgendaTask]
    agentRuns: List[AgentRun]
    memories: List[MemoryItem]
    reminderSettings: ReminderSettings
    weeklySchedule: WeeklySchedule
    apiSettings: ApiSettings
    retentionPolicy: RetentionPolicy
    capabilities: List[Capability]
    syncStatus: SyncStatus
    weeklyReport: WeeklyReport


class AttachmentDownload(BaseModel):
    url: str
    expiresAt: str
