import { useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAgendaApi } from "@/api/api-context"
import { useSession } from "@/auth/session-context"
import { saveCapture } from "@/features/capture/save-capture"
import type {
  AuthorizeAgentRunInput,
  CreateRecordInput,
  CreateTaskInput,
  PostponeTaskInput,
  ReminderSettings,
  TaskCommandInput,
  UpdateMemoryInput,
  UpdateRetentionPolicyInput,
  UpdateTaskDetailsInput,
  WeeklyReportSchedule,
} from "@/lib/types"

export function useAgendaSnapshot() {
  const api = useAgendaApi()
  const { session } = useSession()

  return useQuery({
    queryKey: ["agenda", api.mode, session?.user.id],
    queryFn: () => api.getSnapshot(),
    enabled: Boolean(session),
    refetchInterval: api.mode === "cloud" ? 30_000 : false,
  })
}

export function useSyncStatus() {
  const api = useAgendaApi()
  const { session } = useSession()

  return useQuery({
    queryKey: ["sync-status", api.mode, session?.user.id],
    queryFn: () => api.getSyncStatus(),
    enabled: Boolean(session),
    refetchInterval: api.mode === "cloud" ? 10_000 : false,
    retry: false,
  })
}

export function useAgendaRealtime() {
  const api = useAgendaApi()
  const { session } = useSession()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!session || api.mode !== "cloud") return

    return api.subscribeToChanges((scope) => {
      if (scope === "agenda" || scope === "all") {
        void queryClient.invalidateQueries({
          queryKey: ["agenda", api.mode, session.user.id],
        })
      }
      if (scope === "sync" || scope === "all") {
        void queryClient.invalidateQueries({
          queryKey: ["sync-status", api.mode, session.user.id],
        })
      }
    })
  }, [api, queryClient, session])
}

export function useAgendaActions() {
  const api = useAgendaApi()
  const { session } = useSession()
  const queryClient = useQueryClient()
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["agenda", api.mode, session?.user.id],
    })

  return {
    createRecord: useMutation({
      mutationFn: (input: CreateRecordInput) => api.createRecord(input),
      onSuccess: invalidate,
    }),
    saveCapture: useMutation({
      mutationFn: (input: CreateRecordInput & { attachments: File[] }) =>
        saveCapture(api, input),
      onSuccess: invalidate,
      onError: invalidate,
    }),
    requestRecordAnalysis: useMutation({
      mutationFn: (recordId: string) => api.requestRecordAnalysis(recordId),
      onSuccess: invalidate,
      onError: invalidate,
    }),
    createTask: useMutation({
      mutationFn: (input: CreateTaskInput) => api.createTask(input),
      onSuccess: invalidate,
    }),
    updateTaskDetails: useMutation({
      mutationFn: (input: UpdateTaskDetailsInput) =>
        api.updateTaskDetails(input),
      onSuccess: invalidate,
    }),
    startTask: useMutation({
      mutationFn: (input: TaskCommandInput) => api.startTask(input),
      onSuccess: invalidate,
    }),
    postponeTask: useMutation({
      mutationFn: (input: PostponeTaskInput) => api.postponeTask(input),
      onSuccess: invalidate,
    }),
    completeTask: useMutation({
      mutationFn: (input: TaskCommandInput) => api.completeTask(input),
      onSuccess: invalidate,
    }),
    archiveTask: useMutation({
      mutationFn: (taskId: string) => api.archiveTask(taskId),
      onSuccess: invalidate,
    }),
    restoreTask: useMutation({
      mutationFn: (taskId: string) => api.restoreTask(taskId),
      onSuccess: invalidate,
    }),
    deleteTask: useMutation({
      mutationFn: (taskId: string) => api.deleteTask(taskId),
      onSuccess: invalidate,
    }),
    archiveRecord: useMutation({
      mutationFn: (recordId: string) => api.archiveRecord(recordId),
      onSuccess: invalidate,
    }),
    restoreRecord: useMutation({
      mutationFn: (recordId: string) => api.restoreRecord(recordId),
      onSuccess: invalidate,
    }),
    deleteRecord: useMutation({
      mutationFn: (recordId: string) => api.deleteRecord(recordId),
      onSuccess: invalidate,
    }),
    getAttachmentDownload: useMutation({
      mutationFn: (input: { recordId: string; attachmentId: string }) =>
        api.getAttachmentDownload(input.recordId, input.attachmentId),
    }),
    prepareAgentRun: useMutation({
      mutationFn: (taskId: string) => api.prepareAgentRun(taskId),
    }),
    authorizeAgentRun: useMutation({
      mutationFn: (input: AuthorizeAgentRunInput) =>
        api.authorizeAgentRun(input),
      onSuccess: invalidate,
    }),
    cancelAgentRun: useMutation({
      mutationFn: (runId: string) => api.cancelAgentRun(runId),
      onSuccess: invalidate,
    }),
    updateReminderSettings: useMutation({
      mutationFn: (input: ReminderSettings) =>
        api.updateReminderSettings(input),
      onSuccess: invalidate,
    }),
    updateWeeklySchedule: useMutation({
      mutationFn: (input: WeeklyReportSchedule) =>
        api.updateWeeklySchedule(input),
      onSuccess: invalidate,
    }),
    updateRetentionPolicy: useMutation({
      mutationFn: (input: UpdateRetentionPolicyInput) =>
        api.updateRetentionPolicy(input),
      onSuccess: invalidate,
    }),
    updateMemory: useMutation({
      mutationFn: (input: UpdateMemoryInput) => api.updateMemory(input),
      onSuccess: invalidate,
    }),
    deleteMemory: useMutation({
      mutationFn: (memoryId: string) => api.deleteMemory(memoryId),
      onSuccess: invalidate,
    }),
  }
}
