import type SlopGalleryTelemetry from '../../src/lib/telemetry/SlopGalleryTelemetry.ts'

import {expect, test} from 'bun:test'

import {getDefaultCustomGraphics, toggleGraphicsTuning, useCustomGraphics} from '../../src/lib/rendering/customGraphics.ts'
import {attachGraphicsTuningTelemetry, summarizeFrames} from '../../src/lib/telemetry/graphicsTuningTelemetry.ts'

test('frame statistics cover rate, mean and tail', () => {
  expect(summarizeFrames([10, 10, 10, 30], 'frames')).toEqual({
    'frames.count': 4,
    'frames.fps': 66.667,
    'frames.mean_ms': 15,
    'frames.p50_ms': 10,
    'frames.p95_ms': 30,
    'frames.p99_ms': 30,
    'frames.max_ms': 30,
  })
  expect(summarizeFrames([], 'frames')).toEqual({'frames.count': 0})
})
test('a settled change logs what changed and splits the measured segments', async () => {
  const events: Array<[string, Record<string, unknown>]> = []
  const spans: Array<{
    attributes: Record<string, unknown>
    ended?: Record<string, unknown>
  }> = []
  const telemetry = {
    event: (name: string, attributes: Record<string, unknown>) => events.push([name, attributes]),
    startSpan: (_name: string, {attributes}: {attributes: Record<string, unknown>}) => {
      const span: typeof spans[number] = {attributes}
      spans.push(span)
      return {end: (_status: string, values: Record<string, unknown>) => {
        span.ended = values
      }}
    },
  } as unknown as SlopGalleryTelemetry
  // Bun has no animation frames; the frame statistics are covered above.
  Object.assign(globalThis, {
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
  })
  const detach = attachGraphicsTuningTelemetry(telemetry, () => ({'graphics.profile': 'heavy'}))
  toggleGraphicsTuning()
  useCustomGraphics.setState({vignette: 0.4})
  useCustomGraphics.setState({
    vignette: 0.5,
    contactShadows: true,
  })
  await Bun.sleep(400)
  toggleGraphicsTuning()
  detach()
  useCustomGraphics.setState(getDefaultCustomGraphics(), true)
  expect(events.map(([name]) => name)).toEqual(['graphics.tuning.opened', 'graphics.tuned', 'graphics.tuning.closed'])
  expect(events[1][1]).toMatchObject({
    changed: 'contactShadows,vignette',
    rebuilt: true,
    'from.vignette': 0,
    'to.vignette': 0.5,
    'graphics.profile': 'heavy',
  })
  expect(spans).toHaveLength(2)
  expect(spans[0].ended).toMatchObject({outcome: 'changing'})
  expect(spans[1].attributes).toMatchObject({
    'graphics.tuning.vignette': 0.5,
    'graphics.tuning.contactShadows': true,
  })
  expect(spans[1].ended).toMatchObject({outcome: 'closed'})
})
