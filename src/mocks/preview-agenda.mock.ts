import type {
  AgendaRecord,
  AgendaSnapshot,
  AgendaTask,
  RecordAnalysis,
  Session,
} from "@/lib/types"

const HOUR_IN_MS = 60 * 60 * 1000

function hoursFrom(now: Date, hours: number) {
  return new Date(now.getTime() + hours * HOUR_IN_MS).toISOString()
}

function createAnalysis(
  now: Date,
  completedHoursAgo: number,
  input: Omit<RecordAnalysis, "requestedAt" | "completedAt" | "status">
): RecordAnalysis {
  return {
    ...input,
    requestedAt: hoursFrom(now, -completedHoursAgo - 0.1),
    completedAt: hoursFrom(now, -completedHoursAgo),
    status: "complete",
  }
}

function createRecord(
  input: Pick<
    AgendaRecord,
    "id" | "rawContent" | "source" | "status" | "analysis"
  > & {
    createdAt: string
    taskId?: string
  }
): AgendaRecord {
  return {
    ...input,
    evidenceState: "full",
    persistedAt: input.createdAt,
    updatedAt: input.createdAt,
    attachments: [],
    analysisHistory: [input.analysis],
  }
}

export function createMockPreviewSession(now = new Date()): Session {
  return {
    user: {
      id: "mock-preview-user",
      email: "preview@agenda.quest",
      displayName: "预览用户",
      onboardingCompleted: false,
    },
    authenticatedAt: now.toISOString(),
  }
}

export function createMockAgendaSnapshot(
  now = new Date(),
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
): AgendaSnapshot {
  const recordProductReview = createRecord({
    id: "mock-record-product-review",
    rawContent:
      "周四下午 3 点和产品团队评审 Agenda Quest 新版收集流程，提前整理移动端反馈和三项待决策问题。",
    source: "网页随手记录",
    createdAt: hoursFrom(now, -2),
    status: "ready",
    taskId: "mock-task-product-review",
    analysis: createAnalysis(now, 1.9, {
      runId: "mock-analysis-product-review",
      kind: "event",
      confidence: "high",
      title: "评审新版收集流程",
      nextAction: "汇总移动端反馈并准备三项决策材料",
      suggestedDueAt: hoursFrom(now, 22),
      topics: ["产品评审", "移动端"],
      suggestedSteps: ["汇总移动端反馈", "整理三项待决策问题", "发出评审议程"],
    }),
  })

  const recordResearch = createRecord({
    id: "mock-record-research",
    rawContent:
      "调研面向自由职业者的智能任务助理，重点比较自动拆解、提醒策略和隐私边界，周五前形成一页结论。",
    source: "桌面快捷记录",
    createdAt: hoursFrom(now, -27),
    status: "ready",
    taskId: "mock-task-research",
    analysis: createAnalysis(now, 26.8, {
      runId: "mock-analysis-research",
      kind: "task",
      confidence: "high",
      title: "调研智能任务助理",
      nextAction: "整理 3 个竞品案例并归纳隐私边界",
      suggestedDueAt: hoursFrom(now, 46),
      topics: ["竞品调研", "隐私"],
      suggestedSteps: ["收集竞品案例", "比较提醒策略", "整理一页结论"],
    }),
  })

  const recordReleaseNotes = createRecord({
    id: "mock-record-release-notes",
    rawContent:
      "把本轮可用性走查结果整理成发布说明，明确已修复项、已知限制和下一轮验证范围。",
    source: "网页随手记录",
    createdAt: hoursFrom(now, -51),
    status: "ready",
    taskId: "mock-task-release-notes",
    analysis: createAnalysis(now, 50.8, {
      runId: "mock-analysis-release-notes",
      kind: "task",
      confidence: "high",
      title: "整理可用性走查发布说明",
      nextAction: "合并走查记录并标记已知限制",
      topics: ["发布", "质量"],
      suggestedSteps: ["汇总修复项", "核对已知限制", "确认验证范围"],
    }),
  })

  const recordWeeklyIdea = createRecord({
    id: "mock-record-weekly-idea",
    rawContent:
      "灵感：把每周简报做成“已完成 / 延期 / 未转任务”三栏，附一条下周最重要的行动建议。",
    source: "网页随手记录",
    createdAt: hoursFrom(now, -5),
    status: "needs-review",
    analysis: createAnalysis(now, 4.8, {
      runId: "mock-analysis-weekly-idea",
      kind: "idea",
      confidence: "medium",
      title: "三栏式每周简报",
      nextAction: "确认三栏信息是否足够支持下周规划",
      topics: ["周报", "产品灵感"],
      suggestedSteps: [],
      uncertaintyNote: "尚未确认是否需要转为任务。",
    }),
  })

  const recordReference = createRecord({
    id: "mock-record-reference",
    rawContent:
      "留存：任务提醒应优先呈现下一步动作和来源证据，避免只显示无法执行的抽象标题。",
    source: "剪贴板导入",
    createdAt: hoursFrom(now, -74),
    status: "needs-review",
    analysis: createAnalysis(now, 73.8, {
      runId: "mock-analysis-reference",
      kind: "reference",
      confidence: "high",
      title: "可执行提醒设计原则",
      nextAction: "作为提醒界面设计依据留存",
      topics: ["提醒", "设计原则"],
      suggestedSteps: [],
    }),
  })

  const recordArchived = createRecord({
    id: "mock-record-archived",
    rawContent: "旧版收集箱信息层级走查记录，已由新版评审材料替代。",
    source: "网页随手记录",
    createdAt: hoursFrom(now, -168),
    status: "archived",
    analysis: createAnalysis(now, 167.8, {
      runId: "mock-analysis-archived",
      kind: "reference",
      confidence: "high",
      title: "旧版收集箱走查记录",
      nextAction: "无需继续处理",
      topics: ["历史资料"],
      suggestedSteps: [],
    }),
  })
  recordArchived.updatedAt = hoursFrom(now, -24)

  const taskProductReview: AgendaTask = {
    id: "mock-task-product-review",
    recordId: recordProductReview.id,
    title: "评审 Agenda Quest 新版收集流程",
    nextAction: "汇总移动端反馈并准备三项决策材料",
    dueAt: hoursFrom(now, 22),
    priority: "urgent",
    status: "now",
    steps: [
      {
        id: "mock-step-product-feedback",
        label: "汇总移动端反馈",
        completed: true,
      },
      {
        id: "mock-step-product-decisions",
        label: "整理三项待决策问题",
        completed: false,
      },
      {
        id: "mock-step-product-agenda",
        label: "发出评审议程",
        completed: false,
      },
    ],
    createdAt: hoursFrom(now, -1.8),
    postponeCount: 0,
    revision: 2,
  }

  const taskResearch: AgendaTask = {
    id: "mock-task-research",
    recordId: recordResearch.id,
    title: "调研面向自由职业者的智能任务助理",
    nextAction: "整理 3 个竞品案例并归纳隐私边界",
    dueAt: hoursFrom(now, 46),
    priority: "normal",
    status: "upcoming",
    steps: [
      {
        id: "mock-step-research-products",
        label: "收集 Motion、Todoist 与 Notion AI 的任务拆解流程",
        completed: true,
      },
      {
        id: "mock-step-research-reminders",
        label: "比较提醒策略与用户控制项",
        completed: false,
      },
      {
        id: "mock-step-research-summary",
        label: "整理一页结论",
        completed: false,
      },
    ],
    createdAt: hoursFrom(now, -26.5),
    postponeCount: 2,
    revision: 4,
  }

  const taskReleaseNotes: AgendaTask = {
    id: "mock-task-release-notes",
    recordId: recordReleaseNotes.id,
    title: "整理可用性走查发布说明",
    nextAction: "合并走查记录并标记已知限制",
    priority: "normal",
    status: "completed",
    steps: [
      {
        id: "mock-step-release-fixed",
        label: "汇总已修复项",
        completed: true,
      },
      {
        id: "mock-step-release-limits",
        label: "核对已知限制",
        completed: true,
      },
      {
        id: "mock-step-release-scope",
        label: "确认下一轮验证范围",
        completed: true,
      },
    ],
    createdAt: hoursFrom(now, -50.5),
    startedAt: hoursFrom(now, -24),
    completedAt: hoursFrom(now, -18),
    completionSummary: "发布说明已完成，修复项和后续验证范围均已标注。",
    postponeCount: 0,
    revision: 3,
  }

  const records = [
    recordProductReview,
    recordWeeklyIdea,
    recordResearch,
    recordReleaseNotes,
    recordReference,
    recordArchived,
  ]
  const tasks = [taskProductReview, taskResearch, taskReleaseNotes]
  const observedAt = now.toISOString()

  return {
    records,
    tasks,
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
      timezone,
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
      weekOf: hoursFrom(now, -96),
      completedTaskIds: [taskReleaseNotes.id],
      postponedTasks: [
        {
          taskId: taskResearch.id,
          count: taskResearch.postponeCount,
          recommendation: "把调研范围固定为三个竞品，先完成差异表再补充细节。",
        },
      ],
      unconvertedRecordIds: [recordWeeklyIdea.id],
      referenceRecordIds: [recordReference.id],
      recommendations: [
        {
          content: "先完成新版收集流程评审，再决定是否扩展提醒策略。",
          sourceTaskIds: [taskProductReview.id, taskResearch.id],
          sourceRecordIds: [recordProductReview.id, recordResearch.id],
        },
      ],
    },
  }
}
