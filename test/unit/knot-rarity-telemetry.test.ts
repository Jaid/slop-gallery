import type {ExportBatch, Log, Trace} from 'telemethree'

import {expect, test} from 'bun:test'

import Telemetry from 'telemethree'

import recordRarityChange from '../../src/levels/knottingham/recordRarityChange.ts'

// Isolated in-memory exporter: test ratings never enter the real curation feed.
test('explicit sign edits emit correlated logs and traces with stable identity and before/after values', async () => {
  const batches: Array<ExportBatch> = []
  const telemetry = new Telemetry({
    resource: {
      'service.name': 'knottingham-rarity-test',
      'service.instance.id': 'unit-test',
    },
    exporter: {async export(batch) {
      batches.push(batch)
    }},
  })
  try {
    recordRarityChange(telemetry, {
      id: 'washi_lantern',
      candidateId: 'claude_fable',
      title: 'Washi Lantern',
      baseline: 1,
      previous: 3,
      value: 4,
      sequence: 7,
    })
    await telemetry.flush()
    const logs = batches.filter(batch => batch.signal === 'logs').flatMap(batch => batch.records) as Array<Log>
    const traces = batches.filter(batch => batch.signal === 'traces').flatMap(batch => batch.records) as Array<Trace>
    expect(logs).toHaveLength(1)
    expect(traces).toHaveLength(1)
    expect(logs[0].attributes).toMatchObject({
      'event.name': 'knot.rarity.changed',
      'knot.id': 'washi_lantern',
      'knot.candidate.id': 'claude_fable',
      'rarity.baseline': 1,
      'rarity.previous': 3,
      'rarity.value': 4,
      'edit.sequence': 7,
      'edit.source': 'sign',
    })
    expect(traces[0].name).toBe('knot.rarity.changed')
    expect(traces[0].attributes).toEqual(logs[0].attributes)
    expect(batches.every(batch => batch.resource['service.instance.id'] === 'unit-test')).toBe(true)
    expect(batches.some(batch => batch.signal === 'metrics')).toBe(false)
  } finally {
    await telemetry.dispose()
  }
})
