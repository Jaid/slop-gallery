import type {Attributes, ExportBatch, Log, Metric, Trace} from './types.ts'

export const unixNano = (time: number) => (BigInt(Math.trunc(time)) * 1_000_000n + BigInt(Math.round(time % 1 * 1_000_000))).toString()
function attributeValue(value: boolean | number | string) {
  if (typeof value === 'boolean') {
    return {boolValue: value}
  }
  if (typeof value === 'number') {
    return {doubleValue: value}
  }
  return {stringValue: value}
}
export const otlpAttributes = (attributes: Attributes) => Object.entries(attributes).filter(([, value]) => typeof value !== 'number' || Number.isFinite(value)).map(([key, value]) => ({
  key,
  value: attributeValue(value),
}))
const statusCode = {
  error: 2,
  ok: 1,
  unset: 0,
}
const scope = {
  name: 'telemethree',
  version: '0.1.0',
}
const severity = {
  debug: 5,
  info: 9,
  warn: 13,
  error: 17,
}

export function encodeOtlp(batch: ExportBatch) {
  const resource = {attributes: otlpAttributes(batch.resource)}
  switch (batch.signal) {
    case 'metrics': {
      const groups = Map.groupBy(batch.records as ReadonlyArray<Metric>, metric => metric.name)
      const metrics = Array.from(groups.values(), records => {
        const metric = records[0]!
        const dataPoints = records.map(point => ({
          attributes: otlpAttributes(point.attributes),
          timeUnixNano: unixNano(point.time),
          startTimeUnixNano: unixNano(point.startTime),
          asDouble: point.value,
        }))
        return {
          name: metric.name,
          unit: metric.unit,
          ...metric.kind === 'counter' ? {
            sum: {
              dataPoints,
              aggregationTemporality: 2,
              isMonotonic: true,
            },
          } : {gauge: {dataPoints}},
        }
      })
      return {
        resourceMetrics: [
          {
            resource,
            scopeMetrics: [
              {
                scope,
                metrics,
              },
            ],
          },
        ],
      }
    }
    case 'logs': {
      const logRecords = (batch.records as ReadonlyArray<Log>).map(log => ({
        timeUnixNano: unixNano(log.time),
        observedTimeUnixNano: unixNano(log.time),
        severityNumber: severity[log.level],
        severityText: log.level.toUpperCase(),
        body: {stringValue: log.message},
        attributes: otlpAttributes(log.attributes),
        ...log.context,
      }))
      return {
        resourceLogs: [
          {
            resource,
            scopeLogs: [
              {
                scope,
                logRecords,
              },
            ],
          },
        ],
      }
    }
    case 'traces': {
      const spans = (batch.records as ReadonlyArray<Trace>).map(trace => ({
        name: trace.name,
        traceId: trace.traceId,
        spanId: trace.spanId,
        parentSpanId: trace.parentSpanId,
        kind: 1,
        startTimeUnixNano: unixNano(trace.startTime),
        endTimeUnixNano: unixNano(trace.endTime),
        attributes: otlpAttributes(trace.attributes),
        status: {code: statusCode[trace.status]},
      }))
      return {
        resourceSpans: [
          {
            resource,
            scopeSpans: [
              {
                scope,
                spans,
              },
            ],
          },
        ],
      }
    }
  }
}
