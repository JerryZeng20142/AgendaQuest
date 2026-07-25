import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { AgendaApiProvider } from "@/api/api-context"
import { SessionProvider } from "@/auth/session-context"
import { ColorThemeProvider } from "@/components/color-theme-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppUiProvider } from "@/app/app-ui-context"

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  )

  return (
    <ThemeProvider defaultTheme="system" storageKey="agenda-quest-theme">
      <ColorThemeProvider
        defaultColorTheme="green"
        storageKey="agenda-quest-color-theme"
      >
        <QueryClientProvider client={queryClient}>
          <AgendaApiProvider>
            <SessionProvider>
              <TooltipProvider delayDuration={300}>
                <AppUiProvider>{children}</AppUiProvider>
              </TooltipProvider>
              <Toaster richColors closeButton />
            </SessionProvider>
          </AgendaApiProvider>
        </QueryClientProvider>
      </ColorThemeProvider>
    </ThemeProvider>
  )
}
