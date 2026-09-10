import type {Telemetry} from '../Telemetry.ts'
import type {ThreeStatisticsOptions} from '../ThreeStatistics.ts'
import type {Scene, WebGPURenderer} from 'three/webgpu'

import {useFrame} from '@react-three/fiber/webgpu'
import {useEffect, useRef} from 'react'

import {ThreeStatistics} from '../ThreeStatistics.ts'
import {useTelemetry} from './context.tsx'

export type ThreeTelemetryOptions = ThreeStatisticsOptions & {telemetry?: Telemetry}

/** Collect from the WebGPU Canvas after all render passes. */
export function useThreeTelemetry(options: ThreeTelemetryOptions = {}) {
  const {telemetry, intervalMs, maxSamples, gpuIntervalMs, hitchThresholdMs, hitchCooldownMs} = options
  const latest = useRef(options)
  latest.current = options
  const client = useTelemetry(telemetry)
  const collector = useRef<ThreeStatistics | null>(null)
  const stop = useRef<(() => void) | null>(null)
  const scene = useRef<Scene | null>(null)
  const renderer = useRef<WebGPURenderer | null>(null)
  const previousFrame = useRef<number | null>(null)
  useEffect(() => {
    const stopDelivery = client.start()
    const reset = () => {
      collector.current?.reset()
      previousFrame.current = null
    }
    document.addEventListener('visibilitychange', reset)
    return () => {
      document.removeEventListener('visibilitychange', reset)
      stop.current?.()
      stop.current = null
      collector.current = null
      previousFrame.current = null
      stopDelivery()
    }
  }, [client, intervalMs, maxSamples, gpuIntervalMs, hitchThresholdMs, hitchCooldownMs])
  useFrame(state => {
    if (!collector.current || renderer.current !== state.renderer || scene.current !== state.scene) {
      stop.current?.()
      collector.current = new ThreeStatistics(client, state.renderer, state.scene, {
        intervalMs,
        maxSamples,
        gpuIntervalMs,
        hitchThresholdMs,
        hitchCooldownMs,
        getAttributes: () => ({
          ...latest.current.attributes,
          ...latest.current.getAttributes?.(),
        }),
        getTraceContext: () => latest.current.getTraceContext?.(),
        getHitchAttributes: () => latest.current.getHitchAttributes?.() ?? {},
        describePass: (passScene, camera, target) => latest.current.describePass?.(passScene, camera, target),
      })
      stop.current = collector.current.connect()
      renderer.current = state.renderer
      scene.current = state.scene
    }
    if (document.visibilityState !== 'hidden') {
      collector.current.beginFrame()
    }
  }, {phase: 'start'})
  useFrame(() => {
    if (document.visibilityState !== 'hidden') {
        // Fiber clamps simulation delta. Use wall-clock frame intervals so stalls remain visible.
      const now = performance.now()
      const delta = previousFrame.current === null ? 0 : (now - previousFrame.current) / 1000
      previousFrame.current = now
      collector.current?.endFrame(delta)
    }
  }, {phase: 'finish'})
  return client
}
