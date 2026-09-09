import type {EgoSample} from '../src/main.ts'
import type {Metric} from 'telemethree'

import {expect, test} from 'bun:test'

import {Telemetry} from 'telemethree'

import {EgoTelemetry} from '../src/main.ts'

function fixture() {
  const metrics: Array<Metric> = []
  const telemetry = new Telemetry({
    exporter: {
      export: async batch => {
        if (batch.signal === 'metrics') {
          metrics.push(...batch.records as Array<Metric>)
        }
      },
    },
  })
  return {
    telemetry,
    metrics,
    values: () => Object.fromEntries(metrics.map(metric => [metric.name, metric.value])),
  }
}
test('world-space position, physical velocity and normalized aim are numeric metrics, not labels', async () => {
  const {telemetry, metrics, values} = fixture()
  const ego = new EgoTelemetry({
    telemetry,
    metersPerUnit: 0.01,
    read: () => null,
  })
  ego.record({
    position: {
      x: 100,
      y: 200,
      z: 300,
    },
    velocity: {
      x: 300,
      y: 400,
      z: 0,
    },
    aim: {
      origin: {
        x: 100,
        y: 200,
        z: 300,
      },
      direction: {
        x: 0,
        y: 0,
        z: -3,
      },
      hit: {
        point: {
          x: 100,
          y: 200,
          z: 100,
        },
        distance: 200,
      },
    },
  })
  await telemetry.flush()
  expect(values()).toMatchObject({
    'ego.position.x': 1,
    'ego.velocity.x': 3,
    'ego.speed': 5,
    'ego.aim.direction.z': -1,
    'ego.aim.distance': 2,
    'ego.aim.hit': 1,
  })
  expect(metrics.every(metric => Object.keys(metric.attributes).length === 0)).toBe(true)
})
test('derived velocity copies mutable positions and resets across teleports and suspension', async () => {
  const {telemetry, values} = fixture()
  const position = {
    x: 0,
    y: 0,
    z: 0,
  }
  const ego = new EgoTelemetry({
    telemetry,
    read: () => null,
  })
  ego.record({position}, 0)
  position.x = 2
  ego.record({position}, 1000)
  await telemetry.flush()
  expect(values()['ego.velocity.x']).toBe(2)
  ego.record({
    position: {
      x: 50,
      y: 0,
      z: 0,
    },
    discontinuity: true,
  }, 2000)
  await telemetry.flush()
  expect(values()['ego.velocity.valid']).toBe(0)
  ego.record({position}, 60_000)
  await telemetry.flush()
  expect(values()['ego.velocity.valid']).toBe(0)
  ego.reset()
  ego.record({position}, 61_000)
  await telemetry.flush()
  expect(values()['ego.velocity.valid']).toBe(0)
})
test('sampling gates expensive sources and clears absent aim without stale hit values', async () => {
  const {telemetry, values} = fixture()
  let now = 0
  let reads = 0
  const sample: EgoSample = {
    position: {
      x: 0,
      y: 0,
      z: 0,
    },
    aim: {
      origin: {
        x: 0,
        y: 0,
        z: 0,
      },
      direction: {
        x: 0,
        y: 0,
        z: -1,
      },
      hit: {
        point: {
          x: 0,
          y: 0,
          z: -4,
        },
        distance: 4,
      },
    },
  }
  const ego = new EgoTelemetry({
    telemetry,
    now: () => now,
    read: () => {
      reads++
      return sample
    },
  })
  ego.update()
  ego.update()
  now = 999
  ego.update()
  expect(reads).toBe(1)
  await telemetry.flush()
  expect(values()['ego.aim.distance']).toBe(4)
  sample.aim = undefined
  now = 1000
  ego.update()
  await telemetry.flush()
  expect(values()).toMatchObject({
    'ego.aim.valid': 0,
    'ego.aim.hit': 0,
    'ego.aim.distance': 0,
    'ego.aim.point.z': 0,
  })
  expect(reads).toBe(2)
  expect(() => new EgoTelemetry({
    telemetry,
    intervalMs: 0,
    read: () => null,
  })).toThrow()
})
