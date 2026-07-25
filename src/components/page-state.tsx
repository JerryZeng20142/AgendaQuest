import { AlertCircle, Inbox, RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function PageLoading({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 md:p-6", className)}
      role="status"
      aria-label="正在加载"
    >
      <Skeleton className="h-5 w-36 max-sm:h-4 max-sm:w-28" />
      <Skeleton className="h-20 w-full max-sm:h-16" />
      <Skeleton className="h-20 w-full max-sm:h-16" />
      <Skeleton className="h-20 w-full max-sm:h-16" />
    </div>
  )
}

/** Skeleton that matches the `act-feed` pattern (task rows with dividers). */
export function FeedLoading({ className }: { className?: string }) {
  return (
    <div
      className={cn("act-feed", className)}
      role="status"
      aria-label="正在加载"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="task-feed-item">
          <Skeleton className="mb-2 h-3 w-24 max-sm:h-2.5" />
          <Skeleton className="mb-1 h-5 w-3/4 max-sm:h-4" />
          <Skeleton className="h-4 w-1/2 max-sm:h-3.5" />
        </div>
      ))}
    </div>
  )
}

/** Skeleton for the settings tab content area. */
export function SettingsLoading({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex flex-col gap-6 p-4 md:p-6", className)}
      role="status"
      aria-label="正在加载"
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32 max-sm:h-3.5 max-sm:w-28" />
        <Skeleton className="h-10 w-full max-sm:h-9" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32 max-sm:h-3.5 max-sm:w-28" />
        <Skeleton className="h-10 w-full max-sm:h-9" />
      </div>
      <Skeleton className="h-24 w-full max-sm:h-20" />
    </div>
  )
}

export function PageError({
  message,
  onRetry,
}: {
  message: string
  onRetry(): void
}) {
  return (
    <div className="p-4 md:p-6">
      <Alert variant="destructive">
        <AlertCircle aria-hidden="true" />
        <AlertTitle>内容加载失败</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw data-icon="inline-start" aria-hidden="true" />
          重新加载
        </Button>
      </Alert>
    </div>
  )
}

export function PageEmpty({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <Empty className="min-h-64 border-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Inbox aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  )
}
