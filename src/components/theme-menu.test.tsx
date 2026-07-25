import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { ColorThemeProvider } from "@/components/color-theme-provider"
import { ThemeMenu } from "@/components/theme-menu"
import { ThemeProvider } from "@/components/theme-provider"

const COLOR_THEME_STORAGE_KEY = "test-color-theme"
const THEME_STORAGE_KEY = "test-theme"

function renderThemeMenu() {
  return render(
    <ThemeProvider defaultTheme="light" storageKey={THEME_STORAGE_KEY}>
      <ColorThemeProvider
        defaultColorTheme="green"
        storageKey={COLOR_THEME_STORAGE_KEY}
      >
        <ThemeMenu />
      </ColorThemeProvider>
    </ThemeProvider>
  )
}

describe("ThemeMenu", () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ""
    delete document.documentElement.dataset.colorTheme
  })

  afterEach(() => {
    cleanup()
    document.documentElement.className = ""
    delete document.documentElement.dataset.colorTheme
  })

  it("uses action green by default and persists color and display choices", async () => {
    const user = userEvent.setup()
    renderThemeMenu()

    const green = screen.getByRole("radio", { name: "行动绿主题色" })
    expect(green).toBeChecked()
    await waitFor(() => {
      expect(document.documentElement.dataset.colorTheme).toBe("green")
    })

    await user.click(screen.getByRole("radio", { name: "追踪蓝主题色" }))
    expect(localStorage.getItem(COLOR_THEME_STORAGE_KEY)).toBe("blue")
    expect(document.documentElement.dataset.colorTheme).toBe("blue")

    await user.click(screen.getByRole("tab", { name: "深色主题" }))
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark")
    expect(document.documentElement).toHaveClass("dark")
  })

  it("restores stored color and display choices", async () => {
    localStorage.setItem(COLOR_THEME_STORAGE_KEY, "neutral")
    localStorage.setItem(THEME_STORAGE_KEY, "dark")

    renderThemeMenu()

    expect(screen.getByRole("radio", { name: "墨黑主题色" })).toBeChecked()
    expect(screen.getByRole("tab", { name: "深色主题" })).toHaveAttribute(
      "data-state",
      "active"
    )
    await waitFor(() => {
      expect(document.documentElement.dataset.colorTheme).toBe("neutral")
      expect(document.documentElement).toHaveClass("dark")
    })
  })
})
