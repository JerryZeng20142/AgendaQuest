import { Laptop, Moon, Sun } from "lucide-react"

import { useTheme } from "@/components/theme-provider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export function ThemeMenu() {
  const { theme, setTheme } = useTheme()

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={0}
      value={theme}
      onValueChange={(value) => {
        if (value === "light" || value === "dark" || value === "system") {
          setTheme(value)
        }
      }}
      aria-label="显示主题"
    >
      <ToggleGroupItem value="light" aria-label="浅色主题">
        <Sun data-icon="inline-start" aria-hidden="true" />
        浅色
      </ToggleGroupItem>
      <ToggleGroupItem value="dark" aria-label="深色主题">
        <Moon data-icon="inline-start" aria-hidden="true" />
        深色
      </ToggleGroupItem>
      <ToggleGroupItem value="system" aria-label="跟随系统主题">
        <Laptop data-icon="inline-start" aria-hidden="true" />
        跟随系统
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
