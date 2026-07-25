import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FileText,
  Lightbulb,
  RotateCcw,
} from "lucide-react"
import { Link } from "react-router"

import { PageEmpty, PageError, PageLoading } from "@/components/page-state"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useAgendaSnapshot } from "@/features/agenda/use-agenda"
import { formatWeekday } from "@/lib/format"

function ReportSection({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: typeof CheckCircle2
  children: React.ReactNode
}) {
  return (
    <section className="py-5 first:pt-0">
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-pretty">
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        {title}
      </h2>
      {children}
    </section>
  )
}

export default function WeeklyReportPage() {
  const snapshot = useAgendaSnapshot()

  if (snapshot.isLoading) return <PageLoading />
  if (snapshot.isError)
    return (
      <PageError
        message={snapshot.error.message}
        onRetry={() => snapshot.refetch()}
      />
    )
  if (!snapshot.data)
    return (
      <PageEmpty
        title="周报尚未生成"
        description="生成后的周报会保留对应的任务和原始记录来源。"
      />
    )

  const { weeklyReport: report, tasks, records, weeklySchedule } = snapshot.data
  const taskById = new Map(tasks.map((task) => [task.id, task]))
  const recordById = new Map(records.map((record) => [record.id, record]))

  return (
    <div className="px-4 py-5 md:mx-auto md:max-w-4xl md:px-6 md:py-8">
      <div className="mb-6 flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm text-muted-foreground">
            始于 {formatWeekday(report.weekOf)}
          </p>
          <h1 className="text-xl font-semibold text-pretty">
            本周工作复盘报告
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="size-4" aria-hidden="true" />
          {weeklySchedule.enabled
            ? `${weeklySchedule.weekday} ${weeklySchedule.time} 推送`
            : "定时推送未启用"}
          <Button variant="ghost" size="sm" asChild>
            <Link to="/settings?tab=weekly">
              设置
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>

      <ReportSection title="本周已完成事项" icon={CheckCircle2}>
        <div className="divide-y border-y">
          {report.completedTaskIds.map((id) => {
            const task = taskById.get(id)
            return task ? (
              <div
                key={id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{task.title}</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {task.completionSummary ?? task.nextAction}
                  </p>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/action?task=${encodeURIComponent(task.id)}`}>
                    查看来源
                  </Link>
                </Button>
              </div>
            ) : null
          })}
        </div>
      </ReportSection>
      <Separator />

      <ReportSection title="反复延期任务统计" icon={RotateCcw}>
        <div className="flex flex-col gap-3">
          {report.postponedTasks.map((item) => {
            const task = taskById.get(item.taskId)
            return task ? (
              <div
                key={item.taskId}
                className="flex flex-col gap-2 border-b pb-3 last:border-0 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <p className="font-medium">{task.title}</p>
                    <Badge variant="outline">{item.count} 次</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {item.recommendation}
                  </p>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/action?task=${encodeURIComponent(task.id)}`}>
                    查看任务
                  </Link>
                </Button>
              </div>
            ) : null
          })}
        </div>
      </ReportSection>
      <Separator />

      <ReportSection title="未落地灵感与碎片记录" icon={Lightbulb}>
        <div className="divide-y border-y">
          {report.unconvertedRecordIds.map((id) => {
            const record = recordById.get(id)
            return record ? (
              <div
                key={id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <p className="line-clamp-2 min-w-0 text-sm">
                  {record.rawContent ??
                    record.retainedSummary ??
                    "原始内容已按保留策略删除"}
                </p>
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/inbox?record=${encodeURIComponent(id)}`}>
                    查看原文
                  </Link>
                </Button>
              </div>
            ) : null
          })}
        </div>
      </ReportSection>
      <Separator />

      <ReportSection title="本周重点资料留存" icon={FileText}>
        <div className="flex flex-wrap gap-2">
          {report.referenceRecordIds.map((id) => {
            const record = recordById.get(id)
            return record ? (
              <Button key={id} variant="outline" size="sm" asChild>
                <Link to={`/inbox?record=${encodeURIComponent(id)}`}>
                  {record.analysis.title ?? "查看原始记录"}
                </Link>
              </Button>
            ) : null
          })}
        </div>
      </ReportSection>
      <Separator />

      <ReportSection title="下周优先关注事项" icon={CalendarDays}>
        <Accordion type="multiple" className="border-y">
          {report.recommendations.map((recommendation, index) => (
            <AccordionItem
              key={`${recommendation.content}-${index}`}
              value={`recommendation-${index}`}
            >
              <AccordionTrigger className="px-1 no-underline hover:no-underline">
                <span className="flex min-w-0 items-start gap-3 text-left">
                  <span className="text-muted-foreground tabular-nums">
                    {index + 1}
                  </span>
                  <span className="break-words">{recommendation.content}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-1">
                <div className="flex flex-wrap gap-2">
                  {recommendation.sourceTaskIds.map((id) => {
                    const task = taskById.get(id)
                    return task ? (
                      <Button key={id} variant="outline" size="sm" asChild>
                        <Link
                          to={`/action?task=${encodeURIComponent(task.id)}`}
                        >
                          任务：{task.title}
                        </Link>
                      </Button>
                    ) : null
                  })}
                  {recommendation.sourceRecordIds.map((id) => {
                    const record = recordById.get(id)
                    return record ? (
                      <Button key={id} variant="outline" size="sm" asChild>
                        <Link to={`/inbox?record=${encodeURIComponent(id)}`}>
                          原文：
                          {record.analysis.title ??
                            record.rawContent?.slice(0, 24) ??
                            record.retainedSummary?.slice(0, 24) ??
                            "原始内容已删除"}
                        </Link>
                      </Button>
                    ) : null
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </ReportSection>
    </div>
  )
}
