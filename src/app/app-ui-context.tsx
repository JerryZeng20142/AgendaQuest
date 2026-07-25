import { createContext, useContext, useMemo, useState } from "react"

interface AppUiContextValue {
  quickCaptureOpen: boolean
  setQuickCaptureOpen(open: boolean): void
}

const AppUiContext = createContext<AppUiContextValue | null>(null)

export function AppUiProvider({ children }: { children: React.ReactNode }) {
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false)
  const value = useMemo(
    () => ({ quickCaptureOpen, setQuickCaptureOpen }),
    [quickCaptureOpen]
  )

  return <AppUiContext.Provider value={value}>{children}</AppUiContext.Provider>
}

export function useAppUi() {
  const context = useContext(AppUiContext)
  if (!context) throw new Error("useAppUi 必须在 AppUiProvider 内使用。")
  return context
}
