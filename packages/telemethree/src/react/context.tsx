import type {PropsWithChildren} from 'react'
import type VictoriaClient from 'victoria-browser-client'

import {createContext, use} from 'react'

const Context = createContext<VictoriaClient | null>(null)

export function TelemetryProvider({telemetry, children}: PropsWithChildren<{telemetry: VictoriaClient}>) {
  return <Context value={telemetry}>{children}</Context>
}

/** Use anywhere beneath TelemetryProvider, including outside Canvas, or pass an explicit client. */
export function useTelemetry(telemetry?: VictoriaClient) {
  const context = use(Context)
  const client = telemetry ?? context
  if (!client) {
    throw new Error('useTelemetry requires a TelemetryProvider or an explicit Victoria client.')
  }
  return client
}
