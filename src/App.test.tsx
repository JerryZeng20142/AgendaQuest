import { act, cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { BrowserRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import App from "@/App"
import { agendaApi } from "@/api"
import { AppProviders } from "@/app/providers"
import { AppShell } from "@/layouts/app-shell"

describe("application access flow", () => {
  beforeEach(async () => {
    await agendaApi.logout()
    window.history.replaceState({}, "", "/action")
  })

  afterEach(() => cleanup())

  it("completes onboarding and exposes the requested Tabs navigation", async () => {
    const user = userEvent.setup()
    render(
      <AppProviders>
        <App />
      </AppProviders>
    )

    expect(
      await screen.findByRole("heading", { name: "登录你的工作区" })
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "进入预览" }))

    expect(
      await screen.findByRole("heading", { name: "你主要想管理什么？" })
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "下一步" }))
    expect(
      await screen.findByRole("heading", { name: "选择网页内随手记录快捷键" })
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "下一步" }))
    expect(
      await screen.findByRole("heading", { name: "设置基础提醒强度" })
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "完成设置" }))

    expect(
      await screen.findByRole("heading", { name: "我的收集箱" })
    ).toBeInTheDocument()
    const mainNavigation = screen.getByRole("tablist", { name: "主导航" })
    expect(
      within(mainNavigation)
        .getAllByRole("tab")
        .map((tab) => tab.textContent)
    ).toEqual(["收集箱", "行动台", "简报"])
    expect(screen.queryByText("Agenda Quest")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("tab", { name: "已归档" })
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "打开设置" }))
    expect(
      await screen.findByRole("heading", { name: "设置" })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("tablist", { name: "主导航" })
    ).not.toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "浅色主题" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "退出登录" })).toBeInTheDocument()
    window.history.pushState({}, "", "/archive")
    window.dispatchEvent(new PopStateEvent("popstate"))
    expect(
      await screen.findByRole("heading", { name: "归档列表" })
    ).toBeInTheDocument()
    expect(`${window.location.pathname}${window.location.search}`).toBe(
      "/settings?tab=archive"
    )
  })

  it("preserves a quick-capture draft until discard is confirmed", async () => {
    await agendaApi.login({
      email: "preview@agenda.quest",
      password: "preview-only",
    })
    await agendaApi.completeOnboarding({
      scenario: "work",
      captureShortcut: "mod-shift-space",
      reminderPreset: "standard",
    })
    window.history.replaceState({}, "", "/inbox")
    render(
      <AppProviders>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/inbox" element={<h1>我的收集箱</h1>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppProviders>
    )
    expect(
      await screen.findByRole("heading", { name: "我的收集箱" })
    ).toBeInTheDocument()

    const quickCaptureButton = await screen.findByRole("button", {
      name: "随手记录",
    })
    await act(async () => quickCaptureButton.click())
    const editor = await screen.findByRole("textbox", { name: "随手记录内容" })
    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      )?.set
      valueSetter?.call(editor, "不能意外丢失的草稿")
      editor.dispatchEvent(new Event("input", { bubbles: true }))
    })
    expect(
      screen.getByRole("button", { name: "截取所选屏幕或窗口" })
    ).toBeDisabled()

    await act(async () => {
      editor.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          code: "Escape",
          bubbles: true,
        })
      )
    })
    expect(
      await screen.findByRole("alertdialog", { name: "放弃当前草稿？" })
    ).toBeInTheDocument()
    const continueEditing = screen.getByRole("button", { name: "继续编辑" })
    await act(async () => continueEditing.click())
    expect(screen.getByRole("textbox", { name: "随手记录内容" })).toHaveValue(
      "不能意外丢失的草稿"
    )

    const cancel = screen.getByRole("button", { name: "取消" })
    await act(async () => cancel.click())
    const confirmDiscard = await screen.findByRole("button", {
      name: "确认放弃",
    })
    await act(async () => confirmDiscard.click())
    expect(
      screen.queryByRole("textbox", { name: "随手记录内容" })
    ).not.toBeInTheDocument()
  })
})
