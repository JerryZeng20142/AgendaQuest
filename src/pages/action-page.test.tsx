import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { EditTaskDialog } from "@/pages/action-page"
import type { AgendaTask } from "@/lib/types"

describe("EditTaskDialog", () => {
  it("keeps the surviving step identity and completion state after deletion", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn(async () => true)
    const task: AgendaTask = {
      id: "task-1",
      recordId: "record-1",
      title: "验证步骤身份",
      nextAction: "删除第一步后保存",
      priority: "normal",
      status: "pending",
      steps: [
        { id: "step-first", label: "第一步", completed: false },
        { id: "step-second", label: "第二步", completed: true },
      ],
      createdAt: new Date().toISOString(),
      postponeCount: 0,
      revision: 1,
    }

    render(
      <EditTaskDialog
        task={task}
        open
        onOpenChange={() => undefined}
        onSave={onSave}
        pending={false}
      />
    )

    await user.click(screen.getByRole("button", { name: "删除执行步骤 1" }))
    await user.click(screen.getByRole("button", { name: "保存调整" }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        steps: [{ id: "step-second", label: "第二步", completed: true }],
      })
    )
  })
})
