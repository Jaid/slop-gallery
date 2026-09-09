import type {EgoInput, EgoPlayerHandle, EgoPlayerProps, EgoState} from '../src/main.ts'
import type {RootState} from '@react-three/fiber/webgpu'
import type {RapierContext} from '@react-three/rapier'

import {expect, test} from 'bun:test'

import {createRoot, extend, useThree} from '@react-three/fiber/webgpu'
import {Physics, useRapier} from '@react-three/rapier'
import {act, createRef, StrictMode, Suspense} from 'react'
import {Object3D, WebGPURenderer} from 'three/webgpu'

import EgoPlayer from '../src/main.ts'

extend({Object3D})
test('React lifecycle preserves the motor, camera ownership and ref contract without gallery providers', async () => {
  // Real Fiber, React and Rapier lifecycles with an inert renderer. No browser or GPU interaction.
  const previousActEnvironment = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT')
  Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true})
  const ownerDocument = {pointerLockElement: null as unknown}
  const canvas = {
    width: 100,
    height: 100,
    style: {},
    ownerDocument,
  } as unknown as HTMLCanvasElement
  const renderer = new WebGPURenderer({canvas})
  renderer.hasInitialized = () => true
  renderer.render = () => {}
  const root = createRoot(canvas)
  const player = createRef<EgoPlayerHandle>()
  let physics: RapierContext | undefined
  let scene: RootState | undefined
  let keys: EgoInput = {}
  let inputCalls = 0
  let latest: EgoState | undefined
  let cameraEnabled = true
  function Probe() {
    physics = useRapier()
    scene = useThree()
    return null
  }
  const input = () => keys
  const onInput = () => inputCalls++
  const onUpdate = (state: EgoState) => {
    latest = state
  }
  const cameraToggle = () => cameraEnabled
  const render = (props: Partial<EgoPlayerProps> = {}, mounted = true) => <StrictMode><Suspense fallback={null}><Physics paused>
    {mounted && <EgoPlayer ref={player} input={input} pointerLock={false} gravity={0} cameraEnabled={cameraToggle} onInput={onInput} onUpdate={onUpdate} {...props}/>}
    <Probe/>
  </Physics></Suspense></StrictMode>
  try {
    await root.configure({
      renderer: () => renderer,
      frameloop: 'never',
      size: {
        width: 100,
        height: 100,
        top: 0,
        left: 0,
      },
    })
    await act(async () => {
      root.render(render())
    })
    // Physics suspends on the dynamic WASM import, even after React’s initial commit.
    for (let i = 0; !player.current?.getState() && i < 100; i++) {
      await act(async () => {
        await Bun.sleep(5)
      })
    }
    expect(player.current?.getState()).not.toBeNull()
    const context = physics!
    const state = scene!
    const handle = player.current!
    const body = handle.body!
    expect(context.world.bodies.len()).toBe(1)
    expect(context.world.colliders.len()).toBe(1)
    let time = 0
    const frame = () => state.advance(time += 1000 / 60)
    const tick = (count = 1) => {
      for (let i = 0; i < count; i++) {
        context.step(1 / 60)
      }
      frame()
    }
    keys = {forward: true}
    tick(30)
    expect(inputCalls).toBe(0)
    expect(latest?.active).toBe(false)
    ownerDocument.pointerLockElement = {}
    tick(30)
    expect(inputCalls).toBe(0)
    ownerDocument.pointerLockElement = canvas
    tick(30)
    expect(inputCalls).toBe(30)
    expect(latest?.active).toBe(true)
    expect(latest?.position.z).toBeLessThan(0)
    expect(state.camera.position.y).toBeCloseTo(body.translation().y + 1.6)
    keys = {crouch: true}
    tick()
    expect(handle.getState()?.crouching).toBe(true)
    expect(body.collider(0).halfHeight()).toBeCloseTo(0.2)
    await act(async () => {
      root.render(render({
        speed: 4,
        position: [99, 99, 99],
      }))
    })
    expect(player.current?.body).toBe(body)
    expect(body.translation().x).toBe(0)
    expect(body.collider(0).halfHeight()).toBeCloseTo(0.2)
    expect(body.collider(0).translation().y - body.translation().y).toBeCloseTo(0.5)
    cameraEnabled = false
    state.camera.position.set(8, 9, 10)
    tick()
    expect(state.camera.position.toArray()).toEqual([8, 9, 10])
    handle.teleport([3, 4, 5], [0, 2, 0, 0])
    expect(handle.getState()?.velocity).toEqual({
      x: 0,
      y: 0,
      z: 0,
    })
    expect(state.camera.position.toArray()).toEqual([3, 4.9, 5])
    expect(state.camera.quaternion.toArray()).toEqual([0, 1, 0, 0])
    expect(() => handle.teleport([0, 0, 0], [0, 0, 0, 0])).toThrow(RangeError)
    expect(handle.getState()?.position).toEqual({
      x: 3,
      y: 4,
      z: 5,
    })
    cameraEnabled = true
    keys = {}
    tick()
    expect(state.camera.position.x).toBe(3)
    await act(async () => {
      root.render(render({requirePointerLock: false}))
    })
    ownerDocument.pointerLockElement = null
    keys = {forward: true}
    tick(30)
    expect(latest?.active).toBe(true)
    await act(async () => {
      root.render(render({
        requirePointerLock: false,
        dodgeFactor: 1.2,
        dodgeJumpFactor: 1.05,
      }))
    })
    keys = {
      right: true,
      sprint: true,
    }
    tick(120)
    expect(Math.hypot(latest!.velocity.x, latest!.velocity.z)).toBeCloseTo(3 * 1.2, 4)
    await act(async () => {
      root.render(render({}, false))
    })
    expect(player.current).toBeNull()
    expect(context.world.bodies.len()).toBe(0)
    expect(context.world.colliders.len()).toBe(0)
    expect(context.beforeStepCallbacks.size).toBe(0)
    expect(context.afterStepCallbacks.size).toBe(0)
  } finally {
    await act(async () => root.unmount())
    if (previousActEnvironment) {
      Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', previousActEnvironment)
    } else {
      Reflect.deleteProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT')
    }
  }
})
