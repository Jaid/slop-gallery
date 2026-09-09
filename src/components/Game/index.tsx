import type {WebgpuRendererOptions} from '#src/lib/rendering/WebgpuRenderer.ts'
import type {Controls} from './normalizeControls'
import type {PhysicsProps} from '@react-three/rapier'
import type {ComponentProps, ReactNode} from 'react'

import {KeyboardControls} from '@react-three/drei/webgpu'
import {Canvas} from '@react-three/fiber/webgpu'
import {Physics} from '@react-three/rapier'

import Postprocessing from '#component/Postprocessing'
import TelemetryBridge from '#component/TelemetryBridge'
import WebgpuCaptureBridge from '#component/WebgpuCaptureBridge'
import {WebgpuRenderer} from '#src/lib/rendering/WebgpuRenderer.ts'

import normalizeControls from './normalizeControls'

type GameSpecificProps<Actions extends string> = {
  controls?: Controls<Actions>
  lite?: boolean
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
  lite = false,
  children,
  physics = false,
  ...canvasProps}: GameProps<Actions>) {
  let world = children
  if (physics) {
    const physicsProps: Omit<PhysicsProps, 'children'> = physics === true ? defaultPhysics : physics
    world = <Physics {...physicsProps}>{world}</Physics>
  }
  const canvas = <Canvas {...canvasProps} renderer={(options: WebgpuRendererOptions) => new WebgpuRenderer({
    ...options,
    alpha: false,
    antialias: !lite,
  })}>
    <WebgpuCaptureBridge/>
    <TelemetryBridge/>
    {world}
    {!lite && postprocessing}
  </Canvas>
  if (!controls) {
    return canvas
  }
  return <KeyboardControls map={normalizeControls(controls)}>{canvas}</KeyboardControls>
}
export default Game
