export type Attributes = Readonly<Record<string, boolean | number | string>>
export type Signal = 'logs' | 'metrics' | 'traces'
export type TraceContext = {spanId: string
  traceId: string}
export type Metric = {
  attributes: Attributes
  kind: 'counter' | 'gauge'
  name: string
  startTime: number
  time: number
  unit: string
  value: number
}
export type Log = {
  attributes: Attributes
  context?: TraceContext
  level: 'debug' | 'error' | 'info' | 'warn'
  message: string
  time: number
}
export type Trace = TraceContext & {
  attributes: Attributes
  endTime: number
  name: string
  parentSpanId?: string
  startTime: number
  status: 'error' | 'ok' | 'unset'
}
export type Records = {logs: Log
  metrics: Metric
  traces: Trace}
export type ExportBatch<S extends Signal = Signal> = {
  records: ReadonlyArray<Records[S]>
  resource: Attributes
  signal: S
}
export type ExportResult = {rejected?: number
  warning?: string} | undefined
export interface TelemetryExporter {
  export: (batch: ExportBatch) => Promise<ExportResult>
}
export type MetricOptions = {attributes?: Attributes
  unit?: string}
export type TelemetryOptions = {
  exporter: TelemetryExporter
  flushIntervalMs?: number
  maxBatchSize?: number
  maxQueueSize?: number
  maxRecordBytes?: number
  maxSeries?: number
  now?: () => number
  resource?: Attributes
}
