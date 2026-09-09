import type {Telemetry} from '../Telemetry.ts'
import type {RendererInfo, ThreeStatisticsOptions} from '../ThreeStatistics.ts'
import type {Object3D} from 'three'

import {useEffect, useRef} from 'react'

import {ThreeStatistics} from '../ThreeStatistics.ts'
import {useTelemetry} from './context.tsx'

export type ThreeTelemetryOptions = ThreeStatisticsOptions & {telemetry?: Telemetry}
type FrameState = {renderer: {info: RendererInfo}
  scene: Object3D}
type FrameHook = (callback: (state: FrameState, delta: number) => void, options: {phase: 'finish' | 'start'}) => unknown

/** Separate entry points use the Canvas implementation's own Fiber context. */
export function createThreeTelemetryHook(useFrame: FrameHook) {
  return function useThreeTelemetry({telemetry, intervalMs, maxSamples, attributes}: ThreeTelemetryOptions = {}) {
    const client = useTelemetry(telemetry)
    const collector = useRef<ThreeStatistics | null>(null)
    const stop = useRef<(() => void) | null>(null)
    const scene = useRef<Object3D | null>(null)
    const info = useRef<RendererInfo | null>(null)
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
    }, [client, intervalMs, maxSamples, attributes])
    useFrame(state => {
      if (!collector.current || info.current !== state.renderer.info || scene.current !== state.scene) {
        stop.current?.()
        collector.current = new ThreeStatistics(client, state.renderer.info, state.scene, {
          intervalMs,
          maxSamples,
          attributes,
        })
        stop.current = collector.current.connect()
        info.current = state.renderer.info
        scene.current = state.scene
      }
      collector.current.beginFrame()
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
}
