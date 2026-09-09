import {useFrame} from '@react-three/fiber/webgpu'

import {createEgoTelemetryHook} from './createEgoTelemetryHook.ts'

export const useEgoTelemetry = createEgoTelemetryHook(useFrame)
