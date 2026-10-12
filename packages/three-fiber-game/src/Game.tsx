import type {Controls} from './normalizeControls.ts'
import type {WebgpuRendererOptions} from './WebgpuRenderer.ts'
import type {GameWrappers} from './wrap.tsx'
import type {ShadowsConfig} from '@react-three/fiber'
import type {PhysicsProps} from '@react-three/rapier'
import type {ComponentProps} from 'react'

import {KeyboardControls} from '@react-three/drei/webgpu'
import {Canvas} from '@react-three/fiber'
import {Physics} from '@react-three/rapier'

import normalizeControls from './normalizeControls.ts'
import RendererShadows from './RendererShadows.tsx'
import WebgpuRenderer from './WebgpuRenderer.ts'
import wrap from './wrap.tsx'

export type GameRenderer = (options: WebgpuRendererOptions) => Promise<WebgpuRenderer> | WebgpuRenderer
export type GamePhysicsProps = Omit<PhysicsProps, 'children'>
export type GameProps<Actions extends string = string> = Omit<ComponentProps<typeof Canvas>, keyof GameSpecificProps<Actions> | 'flat' | 'gl'> & GameSpecificProps<Actions>
type GameSpecificProps<Actions extends string> = {
  controls?: Controls<Actions>
  physics?: GamePhysicsProps | boolean
  renderer?: GameRenderer
  /** Inside Canvas, outside Physics. Suitable for scene providers and render effects. */
  sceneWrapper?: GameWrappers
  /** Applied to the factory-built renderer and kept in sync. Omitted leaves its shadow map untouched. */
  shadows?: Exclude<ShadowsConfig, 'soft'>
  /** Outside Canvas, inside keyboard controls. Suitable for DOM providers and boundaries. */
  wrapper?: GameWrappers
}

const defaultPhysics: GamePhysicsProps = {gravity: [0, -9.81, 0]}
const createRenderer: GameRenderer = options => new WebgpuRenderer({
  ...options,
  alpha: false,
  antialias: false,
})

export default function Game<Actions extends string = string>({controls, children, physics = false, renderer = createRenderer, shadows, wrapper, sceneWrapper, ...canvasProps}: GameProps<Actions>) {
  let world = children
  if (physics) {
    world = <Physics {...physics === true ? defaultPhysics : physics}>{world}</Physics>
  }
  // Fiber types the default canvas as its own DOM-free OffscreenCanvas stub; a game renderer only ever receives real canvases.
  const canvas = wrap(<Canvas {...canvasProps} renderer={renderer as ComponentProps<typeof Canvas>['renderer']}><RendererShadows shadows={shadows}>{wrap(world, sceneWrapper)}</RendererShadows></Canvas>, wrapper)
  const controlsMap = controls ? normalizeControls(controls) : []
  if (!controlsMap.length) {
    return canvas
  }
  return <KeyboardControls map={controlsMap}>{canvas}</KeyboardControls>
}
