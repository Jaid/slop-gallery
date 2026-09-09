import {useFrame} from '@react-three/fiber'

import {createThreeTelemetryHook} from './createThreeTelemetryHook.ts'

export {TelemetryProvider, useTelemetry} from './context.tsx'
export type {ThreeTelemetryOptions} from './createThreeTelemetryHook.ts'
export const useThreeTelemetry = createThreeTelemetryHook(useFrame)
