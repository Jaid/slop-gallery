import type Telemetry from '../Telemetry.ts'
import type {PropsWithChildren} from 'react'

import {createContext, useContext, useEffect} from 'react'

const Context = createContext<Telemetry | null>(null)

export function TelemetryProvider({telemetry, children}: PropsWithChildren<{telemetry: Telemetry}>) {
  useEffect(() => telemetry.start(), [telemetry])
  return <Context value={telemetry}>{children}</Context>
}

/** Use anywhere beneath TelemetryProvider, including outside Canvas, or pass an explicit client. */
export function useTelemetry(telemetry?: Telemetry) {
  const context = useContext(Context)
  const client = telemetry ?? context
  if (!client) {
    throw new Error('useTelemetry requires a TelemetryProvider or an explicit Telemetry instance.')
  }
  return client
}
