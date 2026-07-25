import { useRef, useState } from "react"
import { FileText, Mic, Paperclip, ScreenShare, Send, X } from "lucide-react"
import { toast } from "sonner"

import { useAgendaApi } from "@/api/api-context"
import { useAppUi } from "@/app/app-ui-context"
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAgendaActions } from "@/features/agenda/use-agenda"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  captureScreenFrame,
  isScreenCaptureSupported,
} from "@/platform/screen-capture"

interface CaptureFormProps {
  content: string
  attachments: File[]
  persistedRecordId: string | null
  onContentChange(value: string): void
  onAttachmentsChange(value: File[]): void
  onPersistedRecordChange(value: string | null): void
  onRequestClose(): void
  onSaved(): void
}

function CaptureForm({
  content,
  attachments,
  persistedRecordId,
  onContentChange,
  onAttachmentsChange,
  onPersistedRecordChange,
  onRequestClose,
  onSaved,
}: CaptureFormProps) {
  const api = useAgendaApi()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [captureError, setCaptureError] = useState("")
  const [attachmentRetryPending, setAttachmentRetryPending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const isMobile = useIsMobile()
  const captureSupported = isScreenCaptureSupported()
  const { saveCapture } = useAgendaActions()

  const completeCapture = () => {
    onContentChange("")
    onAttachmentsChange([])
    onPersistedRecordChange(null)
    setConfirmOpen(false)
    setCaptureError("")
    onSaved()
  }

  const saveRecord = async () => {
    setCaptureError("")
    try {
      const result = await saveCapture.mutateAsync({
        rawContent: content.trim(),
        source: "网页随手记录",
        attachments,
      })
      if (result.warnings.length) toast.warning(result.warnings.join(" "))
      if (result.attachmentUploadFailed) {
        onPersistedRecordChange(result.record.id)
        setConfirmOpen(false)
        setCaptureError("原始内容已保存。请重试附件上传，或明确放弃附件。")
        return
      }
      if (!result.warnings.length) {
        toast.success(
          api.mode === "cloud"
            ? "原始记录已保存，正在后台处理。"
            : "记录已保留在预览会话中，未调用 AI 服务。"
        )
      }
      completeCapture()
    } catch (error) {
      setConfirmOpen(false)
      setCaptureError(
        error instanceof Error ? error.message : "原始记录未能保存，请重试。"
      )
    }
  }

  const retryAttachments = async () => {
    if (!persistedRecordId || attachments.length === 0) {
      completeCapture()
      return
    }
    setAttachmentRetryPending(true)
    setCaptureError("")
    try {
      await api.uploadRecordAttachments(persistedRecordId, attachments)
      toast.success("附件已补充到原始记录。")
      completeCapture()
    } catch (error) {
      setCaptureError(
        error instanceof Error ? error.message : "附件仍未上传，请重试。"
      )
    } finally {
      setAttachmentRetryPending(false)
    }
  }

  const capture = async () => {
    setCaptureError("")
    try {
      const file = await captureScreenFrame()
      onAttachmentsChange([...attachments, file])
      toast.success("所选画面已加入原始记录。")
    } catch (error) {
      setCaptureError(error instanceof Error ? error.message : "截图未能完成。")
    }
  }

  return (
    <>
      <div className="flex min-w-0 flex-col gap-4 px-4 pb-4 md:px-0 md:pb-0">
        <Textarea
          autoFocus={!isMobile}
          name="quick-capture"
          value={content}
          onChange={(event) => onContentChange(event.target.value)}
          placeholder="粘贴文字、输入灵感、记录事项…"
          className="min-h-28 resize-none"
          aria-label="随手记录内容"
          disabled={Boolean(persistedRecordId)}
        />
        <div className="flex min-h-8 flex-wrap items-center gap-1">
          <Input
            ref={inputRef}
            type="file"
            className="sr-only"
            multiple
            onChange={(event) =>
              onAttachmentsChange(Array.from(event.target.files ?? []))
            }
            aria-label="添加附件"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => inputRef.current?.click()}
            aria-label="添加附件"
          >
            <Paperclip aria-hidden="true" />
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void capture()}
                  disabled={!captureSupported}
                  aria-label="截取所选屏幕或窗口"
                >
                  <ScreenShare aria-hidden="true" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {captureSupported
                ? "截取所选屏幕或窗口"
                : "当前浏览器不支持屏幕截图"}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled
                  aria-label="语音速记暂不可用"
                >
                  <Mic aria-hidden="true" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>语音服务尚未接入</TooltipContent>
          </Tooltip>
        </div>
        {attachments.length ? (
          <div
            className="flex flex-col gap-1 text-sm text-muted-foreground"
            aria-live="polite"
          >
            {attachments.map((file) => (
              <div
                key={`${file.name}-${file.size}-${file.lastModified}`}
                className="flex min-w-0 items-center gap-2"
              >
                <FileText className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{file.name}</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() =>
                    onAttachmentsChange(
                      attachments.filter((item) => item !== file)
                    )
                  }
                  aria-label={`移除附件 ${file.name}`}
                >
                  <X aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}
        {captureError ? (
          <p role="alert" className="text-sm text-destructive">
            {captureError}
          </p>
        ) : null}
        <div className="flex items-center justify-end gap-2 border-t pt-4">
          <Button variant="ghost" onClick={onRequestClose}>
            取消
          </Button>
          {persistedRecordId ? (
            <Button
              onClick={() => void retryAttachments()}
              disabled={attachmentRetryPending}
            >
              {attachmentRetryPending
                ? "正在上传…"
                : attachments.length
                  ? "重试上传附件"
                  : "完成"}
            </Button>
          ) : (
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!content.trim() || saveCapture.isPending}
            >
              <Send data-icon="inline-start" aria-hidden="true" />
              提交记录
            </Button>
          )}
        </div>
      </div>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {api.mode === "cloud"
                ? "将本条内容交由 AI 识别处理？"
                : "保存这条原始记录？"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {api.mode === "cloud"
                ? "系统会先保存原始内容，再发起后台解析。提交后可立即离开。"
                : "内容会保留在当前预览会话中；预览未连接 AI，不会创建分析运行。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>继续编辑</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void saveRecord()}
              disabled={saveCapture.isPending}
            >
              {api.mode === "cloud" ? "确认处理" : "确认保存"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function QuickCapture() {
  const api = useAgendaApi()
  const isMobile = useIsMobile()
  const { quickCaptureOpen, setQuickCaptureOpen, quickCaptureReturnFocusRef } =
    useAppUi()
  const [content, setContent] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])
  const [persistedRecordId, setPersistedRecordId] = useState<string | null>(
    null
  )
  const [discardOpen, setDiscardOpen] = useState(false)
  const dirty = Boolean(
    content.trim() || attachments.length || persistedRecordId
  )

  const requestOpenChange = (open: boolean) => {
    if (open) {
      setQuickCaptureOpen(true)
      return
    }
    if (dirty) {
      setDiscardOpen(true)
      return
    }
    setQuickCaptureOpen(false)
  }

  const discardDraft = () => {
    setContent("")
    setAttachments([])
    setPersistedRecordId(null)
    setDiscardOpen(false)
    setQuickCaptureOpen(false)
  }

  // 受控 Dialog 无 DialogTrigger，关闭时手动归还焦点到打开时的触发元素。
  const restoreFocus = (event: Event) => {
    const target = quickCaptureReturnFocusRef.current
    if (target?.isConnected) {
      event.preventDefault()
      target.focus()
    }
  }

  const form = (
    <CaptureForm
      content={content}
      attachments={attachments}
      persistedRecordId={persistedRecordId}
      onContentChange={setContent}
      onAttachmentsChange={setAttachments}
      onPersistedRecordChange={setPersistedRecordId}
      onRequestClose={() => requestOpenChange(false)}
      onSaved={() => setQuickCaptureOpen(false)}
    />
  )

  return (
    <>
      {isMobile ? (
        <Drawer open={quickCaptureOpen} onOpenChange={requestOpenChange}>
          <DrawerContent onCloseAutoFocus={restoreFocus}>
            <DrawerHeader className="text-left">
              <DrawerTitle>快速记录</DrawerTitle>
              <DrawerDescription>
                {api.mode === "cloud"
                  ? "原始内容会先保存，再进入后台解析。"
                  : "原始内容将保留在当前预览会话，不会调用 AI。"}
              </DrawerDescription>
            </DrawerHeader>
            {form}
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={quickCaptureOpen} onOpenChange={requestOpenChange}>
          <DialogContent onCloseAutoFocus={restoreFocus}>
            <DialogHeader>
              <DialogTitle>快速记录</DialogTitle>
              <DialogDescription>
                {api.mode === "cloud"
                  ? "原始内容会先保存，再进入后台解析。"
                  : "原始内容将保留在当前预览会话，不会调用 AI。"}
              </DialogDescription>
            </DialogHeader>
            {form}
          </DialogContent>
        </Dialog>
      )}
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {persistedRecordId ? "放弃未上传的附件？" : "放弃当前草稿？"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {persistedRecordId
                ? "原始文字已经保存，但本地附件尚未上传。放弃后无法从网页恢复这些附件。"
                : "尚未提交的文字和附件会被清除，无法恢复。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>继续编辑</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={discardDraft}>
              确认放弃
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
