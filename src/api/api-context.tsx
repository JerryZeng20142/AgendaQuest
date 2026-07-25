import { createContext, useContext } from "react"

import { agendaApi } from "@/api"
import type { AgendaApi } from "@/api/agenda-api"

const AgendaApiContext = createContext<AgendaApi>(agendaApi)

export function AgendaApiProvider({
  children,
  api = agendaApi,
}: {
  children: React.ReactNode
  api?: AgendaApi
}) {
  return (
    <AgendaApiContext.Provider value={api}>
      {children}
    </AgendaApiContext.Provider>
  )
}

export function useAgendaApi() {
  return useContext(AgendaApiContext)
}
