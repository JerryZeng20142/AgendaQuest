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
  Session,
  SyncStatus,
  TaskCommandInput,
  UpdateMemoryInput,
  UpdateRetentionPolicyInput,
  UpdateTaskDetailsInput,
  WeeklyReportSchedule,
} from "@/lib/types"

function clone<T>(value: T) {
  return structuredClone(value)
}

function makeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`
}

function createPreviewSession(): Session {
  return {
    user: {
      id: "preview-user",
      email: "preview@agenda.quest",
      displayName: "预览用户",
      onboardingCompleted: false,
    },
    authenticatedAt: new Date().toISOString(),
  }
}

function createPreviewSnapshot(): AgendaSnapshot {
  const observedAt = new Date().toISOString()
  return {
    records: [],
    tasks: [],
    agentRuns: [],
    memories: [],
    reminderSettings: {
      mode: "global",
      channels: ["in-app"],
      cooldownMinutes: 30,
      dueWarningHours: 2,
      desktopNotificationsEnabled: false,
    },
    weeklySchedule: {
      enabled: false,
      weekday: "星期日",
      time: "20:00",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      channels: ["in-app"],
    },
    apiSettings: {
      endpoint: "",
      model: "",
      apiKeyConfigured: false,
    },
    retentionPolicy: {
      mode: "keep-full",
      updatedAt: observedAt,
    },
    capabilities: [
      {
        id: "memory",
        name: "长期记忆",
        state: "unavailable",
        detail: "预览模式未连接云端记忆服务。",
        updatedAt: observedAt,
      },
      {
        id: "agent",
        name: "自动 Agent",
        state: "unavailable",
        detail: "预览模式未连接 Agent 运行时。",
        updatedAt: observedAt,
      },
      {
        id: "screen-analysis",
        name: "截图分析",
        state: "unavailable",
        detail: "预览模式未连接截图分析服务。",
        updatedAt: observedAt,
      },
    ],
    syncStatus: {
      state: "unconfigured",
      detail: "预览模式未连接云端同步服务。",
    },
    weeklyReport: {
      weekOf: observedAt,
      completedTaskIds: [],
      postponedTasks: [],
      unconvertedRecordIds: [],
      referenceRecordIds: [],
      recommendations: [],
    },
  }
}

export class PreviewAgendaApi implements AgendaApi {
  readonly mode = "preview" as const
  private activeSession: Session | null = null
  private snapshot = createPreviewSnapshot()
  private readonly taskRequestIds = new Map<
    string,
    { taskId: string; fingerprint: string }
  >()

  subscribeToChanges(_onChange: (scope: "agenda" | "sync" | "all") => void) {
    void _onChange
    return () => undefined
  }

  private requireSession() {
    if (!this.activeSession) throw new Error("预览会话已结束，请重新登录。")
  }

  private findRecord(recordId: string) {
    const record = this.snapshot.records.find((item) => item.id === recordId)
    if (!record) throw new Error("未找到已保存的原始记录。")
    return record
  }

  private findTask(taskId: string) {
    const task = this.snapshot.tasks.find((item) => item.id === taskId)
    if (!task) throw new Error("未找到任务。")
    return task
  }

  async getSession() {
    return clone(this.activeSession)
  }

  async login() {
    this.snapshot = createPreviewSnapshot()
    this.taskRequestIds.clear()
    this.activeSession = createPreviewSession()
    return clone(this.activeSession)
  }

  async logout() {
    this.activeSession = null
    this.snapshot = createPreviewSnapshot()
    this.taskRequestIds.clear()
  }

  async completeOnboarding(input: OnboardingSettings) {
    this.requireSession()
    this.activeSession!.user.onboardingCompleted = true
    this.activeSession!.user.onboardingSettings = clone(input)
    return clone(this.activeSession!)
  }

  async getSnapshot() {
    this.requireSession()
    const currentSnapshot = clone(this.snapshot)
    const observedAt = new Date().toISOString()
    currentSnapshot.capabilities.forEach((capability) => {
      capability.updatedAt = observedAt
    })
    return currentSnapshot
  }

  async createRecord(input: CreateRecordInput) {
    this.requireSession()
    const createdAt = new Date().toISOString()
    const record: AgendaRecord = {
      id: makeId("record"),
      rawContent: input.rawContent,
      evidenceState: "full",
      source: input.source,
      createdAt,
      persistedAt: createdAt,
      updatedAt: createdAt,
      status: "needs-review",
      attachments: [],
      analysis: {
        requestedAt: createdAt,
        status: "unavailable",
        topics: [],
        suggestedSteps: [],
        failureReason:
          "预览模式不会调用 AI 服务，原始记录已保留在当前预览会话中。",
      },
      analysisHistory: [],
    }
    this.snapshot.records.unshift(record)
    this.snapshot.weeklyReport.unconvertedRecordIds.unshift(record.id)
    return clone(record)
  }

  async uploadRecordAttachments(recordId: string, attachments: File[]) {
    this.requireSession()
    const record = this.findRecord(recordId)
    const createdAt = new Date().toISOString()
    const metadata = attachments.map((file) => ({
      id: makeId("attachment"),
      name: file.name,
      mediaType: file.type || "application/octet-stream",
      size: file.size,
      createdAt,
    }))
    record.attachments.push(...metadata)
    record.updatedAt = createdAt
    return clone(metadata)
  }

  async requestRecordAnalysis(recordId: string): Promise<AgendaRecord> {
    this.requireSession()
    this.findRecord(recordId)
    throw new Error("预览模式未连接 AI 服务，原始记录已保留且未创建运行记录。")
  }

  async getAttachmentDownload(
    _recordId: string,
    _attachmentId: string
  ): Promise<{ url: string; expiresAt: string }> {
    this.requireSession()
    void _recordId
    void _attachmentId
    throw new Error("预览模式未连接云端附件服务，无法下载附件。")
  }

  async createTask(input: CreateTaskInput) {
    this.requireSession()
    const fingerprint = JSON.stringify({
      recordId: input.recordId,
      title: input.title,
      nextAction: input.nextAction,
      dueAt: input.dueAt ?? null,
      steps: input.steps,
    })
    const previousRequest = this.taskRequestIds.get(input.clientRequestId)
    if (previousRequest) {
      if (previousRequest.fingerprint !== fingerprint) {
        throw new Error("任务创建请求 ID 已用于不同内容。")
      }
      const previousTask = this.findTask(previousRequest.taskId)
      return clone(previousTask)
    }

    const record = this.findRecord(input.recordId)
    const existingTask = this.snapshot.tasks.find(
      (task) => task.recordId === input.recordId
    )
    if (record.taskId || existingTask) {
      throw new Error("这条原始记录已转换为任务，请直接查看关联任务。")
    }

    const task: AgendaTask = {
      id: makeId("task"),
      recordId: input.recordId,
      title: input.title,
      nextAction: input.nextAction,
      dueAt: input.dueAt,
      priority: "normal",
      status: "pending",
      steps: input.steps.map((label) => ({
        id: makeId("step"),
        label,
        completed: false,
      })),
      createdAt: new Date().toISOString(),
      postponeCount: 0,
      revision: 1,
    }
    this.snapshot.tasks.unshift(task)
    this.taskRequestIds.set(input.clientRequestId, {
      taskId: task.id,
      fingerprint,
    })
    record.taskId = task.id
    record.status = "ready"
    record.updatedAt = new Date().toISOString()
    this.snapshot.weeklyReport.unconvertedRecordIds =
      this.snapshot.weeklyReport.unconvertedRecordIds.filter(
        (id) => id !== record.id
      )
    return clone(task)
  }

  private updateTask(
    taskId: string,
    revision: number,
    apply: (task: AgendaTask) => void
  ) {
    this.requireSession()
    const task = this.findTask(taskId)
    if (task.revision !== revision) {
      throw new Error("任务已在其他位置更新，请刷新后重试。")
    }
    apply(task)
    task.revision += 1
    return clone(task)
  }

  async updateTaskDetails(input: UpdateTaskDetailsInput) {
    return this.updateTask(input.taskId, input.revision, (task) => {
      task.dueAt = input.dueAt
      task.steps = clone(input.steps)
    })
  }

  async startTask(input: TaskCommandInput) {
    return this.updateTask(input.taskId, input.revision, (task) => {
      task.status = "in-progress"
    })
  }

  async postponeTask(input: PostponeTaskInput) {
    return this.updateTask(input.taskId, input.revision, (task) => {
      const dueAt = task.dueAt ? new Date(task.dueAt) : new Date()
      dueAt.setDate(dueAt.getDate() + input.days)
      task.dueAt = dueAt.toISOString()
      task.status = "upcoming"
      task.postponeCount += 1
      const previous = this.snapshot.weeklyReport.postponedTasks.find(
        (item) => item.taskId === task.id
      )
      if (previous) previous.count = task.postponeCount
      else {
        this.snapshot.weeklyReport.postponedTasks.push({
          taskId: task.id,
          count: task.postponeCount,
          recommendation: "尚未生成云端行为建议。",
        })
      }
    })
  }

  async completeTask(input: TaskCommandInput) {
    return this.updateTask(input.taskId, input.revision, (task) => {
      task.status = "completed"
      task.completedAt = new Date().toISOString()
      if (!this.snapshot.weeklyReport.completedTaskIds.includes(task.id)) {
        this.snapshot.weeklyReport.completedTaskIds.push(task.id)
      }
    })
  }

  async archiveTask(taskId: string) {
    this.requireSession()
    const task = this.findTask(taskId)
    task.status = "archived"
    task.archivedAt = new Date().toISOString()
  }

  async restoreTask(taskId: string) {
    this.requireSession()
    const task = this.findTask(taskId)
    task.status = "pending"
    task.completedAt = undefined
    task.archivedAt = undefined
  }

  async deleteTask(taskId: string) {
    this.requireSession()
    const task = this.findTask(taskId)
    this.snapshot.tasks = this.snapshot.tasks.filter(
      (item) => item.id !== taskId
    )
    this.snapshot.agentRuns = this.snapshot.agentRuns.filter(
      (run) => run.taskId !== taskId
    )
    for (const [requestId, request] of this.taskRequestIds) {
      if (request.taskId === taskId) this.taskRequestIds.delete(requestId)
    }
    const record = this.snapshot.records.find(
      (item) => item.id === task.recordId
    )
    if (record?.taskId === taskId) {
      record.taskId = undefined
      if (record.status !== "archived") record.status = "needs-review"
      record.updatedAt = new Date().toISOString()
      if (
        !this.snapshot.weeklyReport.unconvertedRecordIds.includes(record.id)
      ) {
        this.snapshot.weeklyReport.unconvertedRecordIds.push(record.id)
      }
    }
    this.snapshot.weeklyReport.completedTaskIds =
      this.snapshot.weeklyReport.completedTaskIds.filter((id) => id !== taskId)
    this.snapshot.weeklyReport.postponedTasks =
      this.snapshot.weeklyReport.postponedTasks.filter(
        (item) => item.taskId !== taskId
      )
    this.snapshot.weeklyReport.recommendations =
      this.snapshot.weeklyReport.recommendations.filter(
        (item) => !item.sourceTaskIds.includes(taskId)
      )
  }

  async archiveRecord(recordId: string) {
    this.requireSession()
    const record = this.findRecord(recordId)
    record.status = "archived"
    record.updatedAt = new Date().toISOString()
  }

  async restoreRecord(recordId: string) {
    this.requireSession()
    const record = this.findRecord(recordId)
    record.status = record.taskId ? "ready" : "needs-review"
    record.updatedAt = new Date().toISOString()
  }

  async deleteRecord(recordId: string) {
    this.requireSession()
    this.findRecord(recordId)
    const linkedTaskIds = this.snapshot.tasks
      .filter((task) => task.recordId === recordId)
      .map((task) => task.id)
    this.snapshot.records = this.snapshot.records.filter(
      (record) => record.id !== recordId
    )
    this.snapshot.tasks = this.snapshot.tasks.filter(
      (task) => task.recordId !== recordId
    )
    this.snapshot.agentRuns = this.snapshot.agentRuns.filter(
      (run) => !linkedTaskIds.includes(run.taskId)
    )
    this.snapshot.memories = this.snapshot.memories.filter(
      (memory) => !memory.sourceRecordIds.includes(recordId)
    )
    for (const [requestId, request] of this.taskRequestIds) {
      if (linkedTaskIds.includes(request.taskId))
        this.taskRequestIds.delete(requestId)
    }
    this.snapshot.weeklyReport.unconvertedRecordIds =
      this.snapshot.weeklyReport.unconvertedRecordIds.filter(
        (id) => id !== recordId
      )
    this.snapshot.weeklyReport.referenceRecordIds =
      this.snapshot.weeklyReport.referenceRecordIds.filter(
        (id) => id !== recordId
      )
    this.snapshot.weeklyReport.completedTaskIds =
      this.snapshot.weeklyReport.completedTaskIds.filter(
        (id) => !linkedTaskIds.includes(id)
      )
    this.snapshot.weeklyReport.postponedTasks =
      this.snapshot.weeklyReport.postponedTasks.filter(
        (item) => !linkedTaskIds.includes(item.taskId)
      )
    this.snapshot.weeklyReport.recommendations =
      this.snapshot.weeklyReport.recommendations.filter(
        (item) =>
          !item.sourceRecordIds.includes(recordId) &&
          !item.sourceTaskIds.some((id) => linkedTaskIds.includes(id))
      )
  }

  async prepareAgentRun(_taskId: string): Promise<AgentPlan> {
    this.requireSession()
    void _taskId
    throw new Error("预览模式未连接 Agent 运行时，无法发起执行。")
  }

  async authorizeAgentRun(_input: AuthorizeAgentRunInput): Promise<AgentRun> {
    this.requireSession()
    void _input
    throw new Error("预览模式未连接 Agent 运行时，无法授权执行。")
  }

  async cancelAgentRun(_runId: string) {
    this.requireSession()
    void _runId
    throw new Error("预览模式未连接 Agent 运行时，无法取消执行。")
  }

  async updateReminderSettings(input: ReminderSettings) {
    this.requireSession()
    this.snapshot.reminderSettings = clone(input)
    return clone(input)
  }

  async updateWeeklySchedule(input: WeeklyReportSchedule) {
    this.requireSession()
    this.snapshot.weeklySchedule = clone(input)
    return clone(input)
  }

  async saveApiSettings(
    input: ApiSettings & { apiKey?: string }
  ): Promise<ApiSettings> {
    this.requireSession()
    void input
    throw new Error("预览模式未连接云端密钥服务，无法保存 API 设置。")
  }

  async discoverApiModels(
    input: DiscoverApiModelsInput
  ): Promise<ApiModelOption[]> {
    this.requireSession()
    void input
    throw new Error("预览模式未连接云端模型服务，无法读取模型列表。")
  }

  async updateRetentionPolicy(input: UpdateRetentionPolicyInput) {
    this.requireSession()
    this.snapshot.retentionPolicy = {
      ...clone(input),
      updatedAt: new Date().toISOString(),
    }
    return clone(this.snapshot.retentionPolicy)
  }

  async updateMemory(input: UpdateMemoryInput): Promise<MemoryItem> {
    this.requireSession()
    void input
    throw new Error("预览模式未连接长期记忆服务，无法修改记忆。")
  }

  async deleteMemory(memoryId: string) {
    this.requireSession()
    void memoryId
    throw new Error("预览模式未连接长期记忆服务，无法删除记忆。")
  }

  async getSyncStatus(): Promise<SyncStatus> {
    this.requireSession()
    return clone(this.snapshot.syncStatus)
  }
}
