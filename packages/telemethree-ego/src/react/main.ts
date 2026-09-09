import {useFrame} from '@react-three/fiber'

import {createEgoTelemetryHook} from './createEgoTelemetryHook.ts'

export const useEgoTelemetry = createEgoTelemetryHook(useFrame)
