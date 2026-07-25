import { Check, Laptop, Moon, Sun } from "lucide-react"
import { RadioGroup } from "radix-ui"

import {
  type ColorTheme,
  useColorTheme,
} from "@/components/color-theme-provider"
import { useTheme } from "@/components/theme-provider"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

const colorThemes: Array<{
  value: ColorTheme
  label: string
  swatchClassName: string
}> = [
  { value: "neutral", label: "墨黑", swatchClassName: "bg-[#242424]" },
  { value: "green", label: "行动绿", swatchClassName: "bg-[#147a4b]" },
  { value: "blue", label: "追踪蓝", swatchClassName: "bg-[#2f6feb]" },
]

export function ThemeMenu() {
  const { theme, setTheme } = useTheme()
  const { colorTheme, setColorTheme } = useColorTheme()

  return (
    <div className="flex max-w-md flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">显示模式</p>
        <Tabs
          value={theme}
          onValueChange={(value) => {
            if (value === "light" || value === "dark" || value === "system") {
              setTheme(value)
            }
          }}
        >
          <TabsList aria-label="显示主题">
            <TabsTrigger value="light" aria-label="浅色主题">
              <Sun data-icon="inline-start" aria-hidden="true" />
              浅色
            </TabsTrigger>
            <TabsTrigger value="dark" aria-label="深色主题">
              <Moon data-icon="inline-start" aria-hidden="true" />
              深色
            </TabsTrigger>
            <TabsTrigger value="system" aria-label="跟随系统主题">
              <Laptop data-icon="inline-start" aria-hidden="true" />
              跟随系统
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">主题色</p>
        <RadioGroup.Root
          aria-label="主题色"
          value={colorTheme}
          onValueChange={(value) => setColorTheme(value as ColorTheme)}
          className="grid grid-cols-3 gap-2"
        >
          {colorThemes.map((option) => (
            <RadioGroup.Item
              key={option.value}
              value={option.value}
              aria-label={`${option.label}主题色`}
              className="group/color flex h-11 min-w-0 items-center justify-center gap-2 rounded-lg border bg-background px-2 text-sm font-medium transition-colors outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=checked]:border-primary/40 data-[state=checked]:bg-primary/5"
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full text-white ring-1 ring-black/10 dark:ring-white/20",
                  option.swatchClassName
                )}
                aria-hidden="true"
              >
                <Check className="size-3.5 opacity-0 transition-opacity group-data-[state=checked]/color:opacity-100" />
              </span>
              <span className="truncate">{option.label}</span>
            </RadioGroup.Item>
          ))}
        </RadioGroup.Root>
      </div>
    </div>
  )
}
