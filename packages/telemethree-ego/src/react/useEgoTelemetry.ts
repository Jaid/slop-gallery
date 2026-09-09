import type {EgoTelemetryOptions} from '../types.ts'

import {useFrame} from '@react-three/fiber/webgpu'
import {useEffect, useRef} from 'react'

import {EgoTelemetry} from '../EgoTelemetry.ts'

export function useEgoTelemetry(options: EgoTelemetryOptions) {
  const read = useRef(options.read)
  read.current = options.read
  const collector = useRef<EgoTelemetry | null>(null)
  const {telemetry, intervalMs, metersPerUnit, maxVelocityGapMs, attributes, now} = options
  useEffect(() => {
    const stopDelivery = telemetry.start()
    const instance = new EgoTelemetry({
      telemetry,
      intervalMs,
      metersPerUnit,
      maxVelocityGapMs,
      attributes,
      now,
      read: () => read.current(),
    })
    collector.current = instance
    const reset = () => instance.reset()
    document.addEventListener('visibilitychange', reset)
    return () => {
      document.removeEventListener('visibilitychange', reset)
      collector.current = null
      stopDelivery()
    }
  }, [telemetry, intervalMs, metersPerUnit, maxVelocityGapMs, attributes, now])
  useFrame(() => {
    if (document.visibilityState !== 'hidden') {
      collector.current?.update()
    }
  }, {phase: 'finish'})
}
