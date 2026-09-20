import type VictoriaClient from 'victoria-browser-client'

/** The Victoria surface required by Three-specific collectors. */
export type TelemetryClient = Pick<VictoriaClient, 'increment' | 'log' | 'metric' | 'now' | 'startSpan'>
