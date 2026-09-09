import type {ExportBatch, Metric} from 'telemethree'

import {ExportError, OtlpHttpExporter} from 'telemethree'

/** Native VictoriaMetrics JSON import, plus OTLP JSON for VictoriaLogs/VictoriaTraces collectors. */
export class VictoriaExporter extends OtlpHttpExporter {
  override async export(batch: ExportBatch) {
    if (batch.signal !== 'metrics') {
      return super.export(batch)
    }
    // VictoriaMetrics timestamps have millisecond resolution. Keep the latest value per series/ms.
    const points = new Map<string, Metric>
    for (const metric of batch.records as ReadonlyArray<Metric>) {
      const key = JSON.stringify([metric.name, Math.trunc(metric.time), Object.entries(metric.attributes).toSorted(([a], [b]) => a.localeCompare(b))])
      points.set(key, metric)
    }
    const body = `${Array.from(points.values(), metric => JSON.stringify({
      metric: {
        ...Object.fromEntries(Object.entries({
          ...batch.resource,
          ...metric.attributes,
        }).map(([key, value]) => [key, String(value)] as const)),
        __name__: metric.name,
      },
      values: [metric.value],
      timestamps: [Math.trunc(metric.time)],
    })).join('\n')}\n`
    const response = await this.post('metrics', body, 'application/stream+json')
    await response.body?.cancel()
    if (response.status !== 204) {
      throw new ExportError('Expected HTTP 204 from VictoriaMetrics JSON import.', false)
    }
  }
}
