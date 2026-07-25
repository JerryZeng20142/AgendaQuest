import { createContext, useCallback, useContext, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAgendaApi } from "@/api/api-context"
import type { OnboardingSettings, Session } from "@/lib/types"

interface SessionContextValue {
  session: Session | null | undefined
  isLoading: boolean
  error: Error | null
  retry(): Promise<void>
  login(input: { email: string; password: string }): Promise<Session>
  logout(): Promise<void>
  completeOnboarding(input: OnboardingSettings): Promise<Session>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const api = useAgendaApi()
  const queryClient = useQueryClient()
  const sessionQuery = useQuery({
    queryKey: ["session", api.mode],
    queryFn: () => api.getSession(),
    retry: false,
  })

  const onboardingMutation = useMutation({
    mutationFn: (input: OnboardingSettings) => api.completeOnboarding(input),
    onSuccess: (session) => {
      queryClient.setQueryData(["session", api.mode], session)
    },
  })

  const login = async (input: { email: string; password: string }) => {
    const session = await api.login(input)
    queryClient.setQueryData(["session", api.mode], session)
    void queryClient.invalidateQueries({ queryKey: ["agenda", api.mode] })
    return session
  }

  const clearProtectedClientState = useCallback(async () => {
    const agendaQueries = { queryKey: ["agenda", api.mode] }
    const syncQueries = { queryKey: ["sync-status", api.mode] }

    queryClient.setQueryData(["session", api.mode], null)
    queryClient.getMutationCache().clear()

    await Promise.all([
      queryClient.cancelQueries(agendaQueries),
      queryClient.cancelQueries(syncQueries),
    ])

    queryClient.removeQueries(agendaQueries)
    queryClient.removeQueries(syncQueries)
  }, [api.mode, queryClient])

  const logout = async () => {
    await clearProtectedClientState()
    void Promise.race([
      api.logout().catch(() => undefined),
      new Promise<void>((resolve) => window.setTimeout(resolve, 2_000)),
    ])
  }

  useEffect(() => {
    const handleUnauthorized = () => void clearProtectedClientState()
    window.addEventListener("agenda:unauthorized", handleUnauthorized)
    return () =>
      window.removeEventListener("agenda:unauthorized", handleUnauthorized)
  }, [clearProtectedClientState])

  return (
    <SessionContext.Provider
      value={{
        session: sessionQuery.data,
        isLoading: sessionQuery.isLoading,
        error: sessionQuery.error,
        retry: async () => {
          await sessionQuery.refetch()
        },
        login,
        logout,
        completeOnboarding: onboardingMutation.mutateAsync,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) throw new Error("useSession 必须在 SessionProvider 内使用。")
  return context
}
