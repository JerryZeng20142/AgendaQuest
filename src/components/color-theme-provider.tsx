/* eslint-disable react-refresh/only-export-components */
import * as React from "react"

export type ColorTheme = "neutral" | "green" | "blue"

type ColorThemeProviderProps = {
  children: React.ReactNode
  defaultColorTheme?: ColorTheme
  storageKey?: string
}

type ColorThemeProviderState = {
  colorTheme: ColorTheme
  setColorTheme: (colorTheme: ColorTheme) => void
}

const COLOR_THEME_VALUES: ColorTheme[] = ["neutral", "green", "blue"]

const ColorThemeProviderContext = React.createContext<
  ColorThemeProviderState | undefined
>(undefined)

function isColorTheme(value: string | null): value is ColorTheme {
  if (value === null) {
    return false
  }

  return COLOR_THEME_VALUES.includes(value as ColorTheme)
}

export function ColorThemeProvider({
  children,
  defaultColorTheme = "green",
  storageKey = "color-theme",
}: ColorThemeProviderProps) {
  const [colorTheme, setColorThemeState] = React.useState<ColorTheme>(() => {
    const storedColorTheme = localStorage.getItem(storageKey)
    return isColorTheme(storedColorTheme) ? storedColorTheme : defaultColorTheme
  })

  const setColorTheme = React.useCallback(
    (nextColorTheme: ColorTheme) => {
      localStorage.setItem(storageKey, nextColorTheme)
      setColorThemeState(nextColorTheme)
    },
    [storageKey]
  )

  React.useEffect(() => {
    document.documentElement.dataset.colorTheme = colorTheme
  }, [colorTheme])

  React.useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.storageArea !== localStorage || event.key !== storageKey) {
        return
      }

      setColorThemeState(
        isColorTheme(event.newValue) ? event.newValue : defaultColorTheme
      )
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [defaultColorTheme, storageKey])

  const value = React.useMemo(
    () => ({ colorTheme, setColorTheme }),
    [colorTheme, setColorTheme]
  )

  return (
    <ColorThemeProviderContext.Provider value={value}>
      {children}
    </ColorThemeProviderContext.Provider>
  )
}

export function useColorTheme() {
  const context = React.useContext(ColorThemeProviderContext)

  if (context === undefined) {
    throw new Error("useColorTheme must be used within a ColorThemeProvider")
  }

  return context
}
