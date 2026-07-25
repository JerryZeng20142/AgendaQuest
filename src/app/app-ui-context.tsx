import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react"

interface AppUiContextValue {
  quickCaptureOpen: boolean
  setQuickCaptureOpen(open: boolean): void
  quickCaptureReturnFocusRef: React.RefObject<HTMLElement | null>
}

const AppUiContext = createContext<AppUiContextValue | null>(null)

export function AppUiProvider({ children }: { children: React.ReactNode }) {
  const [quickCaptureOpen, setQuickCaptureOpenState] = useState(false)
  const quickCaptureReturnFocusRef = useRef<HTMLElement | null>(null)
  // 受控 Dialog 没有 DialogTrigger，打开时记录触发元素，供关闭后归还焦点。
  const setQuickCaptureOpen = useCallback((open: boolean) => {
    if (open && document.activeElement instanceof HTMLElement) {
      quickCaptureReturnFocusRef.current = document.activeElement
    }
    setQuickCaptureOpenState(open)
  }, [])
  const value = useMemo(
    () => ({ quickCaptureOpen, setQuickCaptureOpen, quickCaptureReturnFocusRef }),
    [quickCaptureOpen, setQuickCaptureOpen]
  )

  return <AppUiContext.Provider value={value}>{children}</AppUiContext.Provider>
}

export function useAppUi() {
  const context = useContext(AppUiContext)
  if (!context) throw new Error("useAppUi 必须在 AppUiProvider 内使用。")
  return context
}
