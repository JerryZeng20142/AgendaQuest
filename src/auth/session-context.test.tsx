import { MutationObserver, QueryClient } from "@tanstack/query-core"
import { QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { AgendaApiProvider } from "@/api/api-context"
import type { AgendaApi } from "@/api/agenda-api"
import { SessionProvider, useSession } from "@/auth/session-context"
import type { Session } from "@/lib/types"

function SessionProbe() {
  const { session, logout } = useSession()
  return (
    <div>
      <span>{session ? session.user.email : "logged-out"}</span>
      <button onClick={() => void logout()}>logout</button>
    </div>
  )
}

describe("SessionProvider logout", () => {
  it("clears local protected state before server logout finishes", async () => {
    const user = userEvent.setup()
    const queryClient = new QueryClient()
    const session: Session = {
      user: {
        id: "user-1",
        email: "user@example.com",
        displayName: "User",
        onboardingCompleted: true,
      },
      authenticatedAt: new Date().toISOString(),
    }
    let finishServerLogout: (() => void) | undefined
    const logout = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishServerLogout = resolve
        })
    )
    const api = {
      mode: "cloud",
      getSession: vi.fn(async () => session),
      logout,
    } as unknown as AgendaApi
    const secretMutation = new MutationObserver(queryClient, {
      mutationFn: async (value: { password: string }) => value,
    })
    await secretMutation.mutate({ password: "SENTINEL_PASSWORD" })

    render(
      <QueryClientProvider client={queryClient}>
        <AgendaApiProvider api={api}>
          <SessionProvider>
            <SessionProbe />
          </SessionProvider>
        </AgendaApiProvider>
      </QueryClientProvider>
    )

    expect(await screen.findByText("user@example.com")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "logout" }))

    expect(await screen.findByText("logged-out")).toBeInTheDocument()
    expect(queryClient.getMutationCache().getAll()).toEqual([])
    expect(logout).toHaveBeenCalledTimes(1)
    finishServerLogout?.()
  })
})
