import type {WebgpuRendererOptions} from '#src/lib/rendering/WebgpuRenderer.ts'
import type {Controls} from './normalizeControls'
import type {PhysicsProps} from '@react-three/rapier'
import type {ComponentProps, ReactNode} from 'react'

import {KeyboardControls} from '@react-three/drei/webgpu'
import {Canvas} from '@react-three/fiber/webgpu'
import {Physics} from '@react-three/rapier'
import {useGraphicsQualityValue} from 'use-graphics-quality'

import Postprocessing from '#component/Postprocessing'
import TelemetryBridge from '#component/TelemetryBridge'
import WebgpuCaptureBridge from '#component/WebgpuCaptureBridge'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsQuality.ts'
import {WebgpuRenderer} from '#src/lib/rendering/WebgpuRenderer.ts'

import normalizeControls from './normalizeControls'

type GameSpecificProps<Actions extends string> = {
  controls?: Controls<Actions>
  physics?: Omit<PhysicsProps, 'children'> | boolean
  postprocessing?: ReactNode
}
type GameProps<Actions extends string = string> = Omit<
  ComponentProps<typeof Canvas>,
  keyof GameSpecificProps<Actions> | 'flat' | 'gl' | 'renderer'
> & GameSpecificProps<Actions>
const defaultPhysics: Omit<PhysicsProps, 'children'> = {gravity: [0, -9.81, 0]}
function Game<Actions extends string = string>({postprocessing = <Postprocessing/>,
  controls,
  children,
  physics = false,
  ...canvasProps}: GameProps<Actions>) {
  const profile = useGraphicsQualityValue(getGraphicsProfile)
  let world = children
  if (physics) {
    const physicsProps: Omit<PhysicsProps, 'children'> = physics === true ? defaultPhysics : physics
    world = <Physics {...physicsProps}>{world}</Physics>
  }
  const canvas = <Canvas shadows={profile.shadows} dpr={profile.dpr} {...canvasProps} renderer={(options: WebgpuRendererOptions) => new WebgpuRenderer({
    ...options,
    alpha: false,
    // Quality uses SMAA in its pipeline; performance renders directly without MSAA.
    // Keep constructor-only options stable so mode changes never recreate the world.
    antialias: false,
  })}>
    <WebgpuCaptureBridge/>
    <TelemetryBridge/>
    {world}
    {profile.postprocessing && postprocessing}
  </Canvas>
  if (!controls) {
    return canvas
  }
  return <KeyboardControls map={normalizeControls(controls)}>{canvas}</KeyboardControls>
}
export default Game
