import { useState } from "react"
import { Edit3, Loader2, LockKeyhole, Trash2 } from "lucide-react"
import { Link } from "react-router"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { useAgendaActions } from "@/features/agenda/use-agenda"
import { SettingsSection } from "@/features/settings/settings-section"
import { formatDateTime } from "@/lib/format"
import type { Capability, MemoryItem } from "@/lib/types"

export function MemorySettings({
  memories,
  capability,
}: {
  memories: MemoryItem[]
  capability: Capability | undefined
}) {
  const { updateMemory, deleteMemory } = useAgendaActions()
  const [editTarget, setEditTarget] = useState<MemoryItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MemoryItem | null>(null)
  const [content, setContent] = useState("")
  const [error, setError] = useState("")
  const canMutate = capability?.state === "available"
  const activeMemories = memories.filter((memory) => memory.status === "active")

  const openEditor = (memory: MemoryItem) => {
    setEditTarget(memory)
    setContent(memory.content)
    setError("")
  }

  const save = async () => {
    if (!editTarget || !content.trim()) return
    setError("")
    try {
      await updateMemory.mutateAsync({
        id: editTarget.id,
        content: content.trim(),
      })
      toast.success("记忆内容已更新。")
      setEditTarget(null)
      setContent("")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "记忆更新失败。")
    } finally {
      updateMemory.reset()
    }
  }

  const remove = async () => {
    if (!deleteTarget) return
    try {
      await deleteMemory.mutateAsync(deleteTarget.id)
      toast.success("记忆内容已删除。")
      setDeleteTarget(null)
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "记忆删除失败。")
    } finally {
      deleteMemory.reset()
    }
  }

  return (
    <SettingsSection
      title="记忆与数据"
      description="查看长期记忆及其原始记录来源。"
    >
      <div className="flex flex-col gap-4">
        {!canMutate ? (
          <Alert>
            <LockKeyhole aria-hidden="true" />
            <AlertTitle>长期记忆当前不可写</AlertTitle>
            <AlertDescription>
              {capability?.detail ?? "尚未读取到长期记忆服务状态。"}
            </AlertDescription>
          </Alert>
        ) : null}
        {activeMemories.length ? (
          <div className="divide-y border-y">
            {activeMemories.map((memory) => (
              <div key={memory.id} className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-relaxed break-words">
                      {memory.content}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      更新于{" "}
                      <time dateTime={memory.updatedAt}>
                        {formatDateTime(memory.updatedAt)}
                      </time>
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditor(memory)}
                      disabled={!canMutate}
                      aria-label="修改记忆内容"
                    >
                      <Edit3 aria-hidden="true" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => setDeleteTarget(memory)}
                      disabled={!canMutate}
                      aria-label="删除记忆内容"
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {memory.sourceRecordIds.map((recordId) => (
                    <Button key={recordId} variant="outline" size="sm" asChild>
                      <Link
                        to={`/inbox?record=${encodeURIComponent(recordId)}`}
                      >
                        查看来源记录
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            当前没有可显示的长期记忆。
          </p>
        )}
      </div>

      <Dialog
        open={Boolean(editTarget)}
        onOpenChange={(open) => !open && setEditTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改记忆内容</DialogTitle>
            <DialogDescription>修改后会保留原始记录来源。</DialogDescription>
          </DialogHeader>
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor="memory-content" className="sr-only">
              记忆内容
            </FieldLabel>
            <Textarea
              id="memory-content"
              name="memoryContent"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="min-h-28 resize-none"
              aria-invalid={Boolean(error)}
              autoComplete="off"
            />
            {error ? <FieldError>{error}</FieldError> : null}
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              取消
            </Button>
            <Button
              onClick={save}
              disabled={!content.trim() || updateMemory.isPending}
            >
              {updateMemory.isPending ? (
                <Loader2
                  data-icon="inline-start"
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : null}
              {updateMemory.isPending ? "正在保存…" : "保存修改"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除这条记忆？</AlertDialogTitle>
            <AlertDialogDescription>
              原始记录不会删除，但该记忆将不再参与后续推断。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              删除记忆
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  )
}
