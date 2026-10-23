import type {CustomGraphics, CustomGraphicsKey} from '../rendering/customGraphics.ts'
import type SlopGalleryTelemetry from './SlopGalleryTelemetry.ts'
import type {Attributes, Span} from 'victoria-browser-client'

import {customGraphicsStructure, getTunedGraphics, useCustomGraphics, useGraphicsTuning} from '../rendering/customGraphics.ts'

type Context = () => Attributes

/** how long the panel’s values have to stay put before a change counts as settled, so a slider drag logs once instead of once per step */
const settleMs = 300
/** frames right after a settled change that the steady statistics leave out, since they carry the pipeline rebuild and shader compilation */
const warmupMs = 500
const flatten = (values: CustomGraphics): Attributes => Object.fromEntries(Object.entries(values).map(([key, value]) => [`graphics.tuning.${key}`, value === false && key === 'antiAliasing' ? 'none' : value]))
const percentile = (sorted: Array<number>, fraction: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ?? 0
const round = (value: number) => Math.round(value * 1000) / 1000

/** Frame time statistics of a stretch of frame durations in milliseconds. */
export function summarizeFrames(durations: Array<number>, prefix: string): Attributes {
  if (durations.length === 0) {
    return {[`${prefix}.count`]: 0}
  }
  const sorted = durations.toSorted((a, b) => a - b)
  const total = durations.reduce((sum, duration) => sum + duration, 0)
  return {
    [`${prefix}.count`]: durations.length,
    [`${prefix}.fps`]: round(1000 * durations.length / total),
    [`${prefix}.mean_ms`]: round(total / durations.length),
    [`${prefix}.p50_ms`]: round(percentile(sorted, 0.5)),
    [`${prefix}.p95_ms`]: round(percentile(sorted, 0.95)),
    [`${prefix}.p99_ms`]: round(percentile(sorted, 0.99)),
    [`${prefix}.max_ms`]: round(sorted.at(-1)!),
  }
}

/**
 * Records what the tuning panel does to performance: every settled change logs which values changed and whether the pipeline rebuilt, and each stretch between two changes becomes a `graphics.tuning.segment` span with every tuned value plus the frame times measured during it.
 *
 * Frame times come from `requestAnimationFrame`, which runs only while the panel shows. The warm-up after a change, with its rebuild and shader compilation, is reported apart from the steady frames.
 */
export function attachGraphicsTuningTelemetry(telemetry: SlopGalleryTelemetry, getContext: Context) {
  let settled = getTunedGraphics()
  let segment: {
    frames: Array<number>
    span: Span
    start: number
    warmup: Array<number>
  } | undefined
  let settleTimer: ReturnType<typeof setTimeout> | undefined
  let frame: number | undefined
  let previousFrame: number | undefined
  const endSegment = (outcome: string) => {
    if (!segment) {
      return
    }
    segment.span.end('ok', {
      outcome,
      'segment.duration_ms': Math.round(performance.now() - segment.start),
      ...summarizeFrames(segment.warmup, 'frames.warmup'),
      ...summarizeFrames(segment.frames, 'frames.steady'),
    })
    segment = undefined
  }
  const startSegment = () => {
    segment = {
      frames: [],
      span: telemetry.startSpan('graphics.tuning.segment', {attributes: {
        ...getContext(),
        ...flatten(settled),
      }}),
      start: performance.now(),
      warmup: [],
    }
  }
  const tick = (time: number) => {
    if (segment && previousFrame !== undefined) {
      const bucket = time - segment.start < warmupMs ? segment.warmup : segment.frames
      bucket.push(time - previousFrame)
    }
    previousFrame = time
    frame = requestAnimationFrame(tick)
  }
  const settle = () => {
    settleTimer = undefined
    const next = getTunedGraphics()
    const changed = (Object.keys(next) as Array<CustomGraphicsKey>).filter(key => next[key] !== settled[key])
    if (changed.length === 0) {
      return
    }
    const rebuilt = changed.some(key => (customGraphicsStructure as ReadonlyArray<string>).includes(key))
    endSegment('changed')
    telemetry.event('graphics.tuned', {
      ...getContext(),
      changed: changed.join(','),
      rebuilt,
      ...Object.fromEntries(changed.flatMap(key => [[`from.${key}`, settled[key] === false ? 'none' : settled[key]], [`to.${key}`, next[key] === false ? 'none' : next[key]]])),
    })
    settled = next
    startSegment()
  }
  const unsubscribeValues = useCustomGraphics.subscribe(() => {
    if (!useGraphicsTuning.getState().open) {
      return
    }
    // Frames during the drag belong to no settled state.
    endSegment('changing')
    clearTimeout(settleTimer)
    settleTimer = setTimeout(settle, settleMs)
  })
  const unsubscribePanel = useGraphicsTuning.subscribe((state, previous) => {
    if (state.open === previous.open) {
      return
    }
    clearTimeout(settleTimer)
    endSegment(state.open ? 'opened' : 'closed')
    settled = getTunedGraphics()
    telemetry.event(state.open ? 'graphics.tuning.opened' : 'graphics.tuning.closed', getContext())
    if (state.open) {
      startSegment()
      previousFrame = undefined
      frame = requestAnimationFrame(tick)
    } else if (frame !== undefined) {
      cancelAnimationFrame(frame)
      frame = undefined
    }
  })
  return () => {
    unsubscribeValues()
    unsubscribePanel()
    clearTimeout(settleTimer)
    if (frame !== undefined) {
      cancelAnimationFrame(frame)
    }
    endSegment('detached')
  }
}
