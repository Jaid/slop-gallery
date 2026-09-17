import type {EgoInput, EgoPlayerHandle, EgoPlayerProps, EgoZoomTransition} from '../src/main.ts'
import type {RootState} from '@react-three/fiber/webgpu'
import type {RapierContext} from '@react-three/rapier'

import {expect, test} from 'bun:test'

import {createRoot, useThree} from '@react-three/fiber/webgpu'
import {CuboidCollider, Physics, RigidBody, useRapier} from '@react-three/rapier'
import {act, createRef, StrictMode, Suspense} from 'react'
import {PerspectiveCamera, WebGPURenderer} from 'three/webgpu'

import EgoPlayer, {defaultEgoOptions} from '../src/main.ts'

test('extended zoom requires rest, yields held Shift to movement, and preserves camera ownership', async () => {
  const previousActEnvironment = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT')
  Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true})
  const ownerDocument = {pointerLockElement: null as unknown}
  const canvas = {
    width: 100,
    height: 100,
    style: {},
    ownerDocument,
  } as unknown as HTMLCanvasElement
  ownerDocument.pointerLockElement = canvas
  const renderer = new WebGPURenderer({canvas})
  renderer.hasInitialized = () => true
  renderer.render = () => {}
  const root = createRoot(canvas)
  const player = createRef<EgoPlayerHandle>()
  let physics: RapierContext | undefined
  let scene: RootState | undefined
  let keys: EgoInput = {}
  let enabled = true
  let cameraEnabled = true
  const zoomAmounts: Array<number> = []
  const transitions: Array<EgoZoomTransition> = []
  const landings: Array<number> = []
  const input = () => keys
  const inputToggle = () => enabled
  const cameraToggle = () => cameraEnabled
  const onZoomChange = (amount: number) => zoomAmounts.push(amount)
  function Probe() {
    physics = useRapier()
    scene = useThree()
    return null
  }
  const render = (props: Partial<EgoPlayerProps> = {}, mounted = true) => <StrictMode><Suspense fallback={null}><Physics paused>
    {mounted && <EgoPlayer
      cameraEnabled={cameraToggle} casualZoomTransition={0} enabled={inputToggle} extendedZoomTransition={0} input={input} onLand={(state, speed) => {
        expect(state.grounded).toBe(true)
          landings.push(speed)
      }} onZoomChange={onZoomChange} onZoomTransition={transition => transitions.push(transition)} pointerLock={false} ref={player} {...props}
    />}
    <RigidBody colliders={false} type='fixed'>
      <CuboidCollider args={[100, 0.1, 100]} position={[0, -0.1, 0]} />
    </RigidBody>
    <Probe />
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
    await act(async () => root.render(render()))
    for (let i = 0; !player.current?.getState() && i < 100; i++) {
      await act(async () => Bun.sleep(5))
    }
    expect(player.current?.getState()).not.toBeNull()
    const context = physics!
    const state = scene!
    const handle = player.current!
    expect(state.camera).toBeInstanceOf(PerspectiveCamera)
    const camera = state.camera as PerspectiveCamera
    const normalFov = camera.fov
    let time = 0
    const frame = (delta = 1 / 60) => state.advance(time += delta * 1000)
    const tick = (count = 1) => {
      for (let i = 0; i < count; i++) {
        context.step(1 / 60)
        frame()
      }
    }
    tick(60)
    expect(handle.getState()?.grounded).toBe(true)
    expect(landings).toHaveLength(0)
    keys = {zoom: true}
    frame()
    expect(camera.fov).toBe(normalFov / 2)
    expect(zoomAmounts.at(-1)).toBe(1)
    expect(transitions).toEqual([{
      from: 'none',
      to: 'casual',
      direction: 'forward',
      duration: 0,
    }])
    frame()
    expect(transitions).toHaveLength(1)
    const casualReports = zoomAmounts.length
    keys = {
      zoom: true,
      sprint: true,
    }
    frame()
    expect(camera.fov).toBe(normalFov / 3)
    expect(zoomAmounts).toHaveLength(casualReports)
    expect(transitions.at(-1)).toEqual({
      from: 'casual',
      to: 'extended',
      direction: 'forward',
      duration: 0,
    })
    keys = {zoom: true}
    frame()
    expect(camera.fov).toBe(normalFov / 2)
    keys = {sprint: true}
    frame()
    expect(camera.fov).toBe(normalFov)
    expect(zoomAmounts.at(-1)).toBe(0)
    for (const direction of ['forward', 'backward', 'left', 'right'] as const) {
      keys = {
        zoom: true,
        sprint: true,
      }
      tick(60)
      expect(camera.fov).toBe(normalFov / 3)
      keys = {
        zoom: true,
        sprint: true,
        [direction]: true,
      }
      // Even before the motor accelerates, movement intent must retract extended zoom.
      frame()
      expect(camera.fov).toBe(normalFov / 2)
      tick(90)
      const velocity = handle.getState()!.velocity
      const factor = direction === 'forward' ? defaultEgoOptions.sprintFactor : defaultEgoOptions.dodgeFactor
      expect(Math.hypot(velocity.x, velocity.z)).toBeCloseTo(defaultEgoOptions.speed * factor, 3)
      expect(camera.fov).toBe(normalFov / 2)
      // Releasing movement does not enable extended zoom during residual deceleration.
      keys = {
        zoom: true,
        sprint: true,
      }
      frame()
      expect(camera.fov).toBe(normalFov / 2)
      tick()
      expect(camera.fov).toBe(normalFov / 2)
      tick(60)
      expect(camera.fov).toBe(normalFov / 3)
    }
    keys = {
      zoom: true,
      forward: true,
    }
    tick(90)
    expect(camera.fov).toBe(normalFov / 2)
    keys = {
      zoom: true,
      forward: true,
      sprint: true,
    }
    frame()
    expect(camera.fov).toBe(normalFov / 2)
    tick(90)
    expect(Math.hypot(handle.getState()!.velocity.x, handle.getState()!.velocity.z)).toBeCloseTo(defaultEgoOptions.speed * defaultEgoOptions.sprintFactor, 3)
    keys = {
      zoom: true,
      sprint: true,
    }
    tick(60)
    expect(camera.fov).toBe(normalFov / 3)
    keys = {
      zoom: true,
      sprint: true,
      jump: true,
    }
    frame()
    expect(camera.fov).toBe(normalFov / 2)
    tick()
    expect(handle.getState()?.grounded).toBe(false)
    expect(handle.getState()!.velocity.y).toBeGreaterThan(0)
    keys = {
      zoom: true,
      sprint: true,
    }
    tick(15)
    expect(handle.getState()?.grounded).toBe(false)
    expect(camera.fov).toBe(normalFov / 2)
    tick(180)
    expect(handle.getState()?.grounded).toBe(true)
    expect(camera.fov).toBe(normalFov / 3)
    expect(landings).toHaveLength(1)
    expect(landings[0]).toBeGreaterThan(1)
    handle.teleport([0, 5, 0])
    expect(camera.fov).toBe(normalFov)
    expect(zoomAmounts.at(-1)).toBe(0)
    frame()
    expect(camera.fov).toBe(normalFov / 2)
    tick(15)
    expect(handle.getState()?.grounded).toBe(false)
    expect(camera.fov).toBe(normalFov / 2)
    tick(180)
    expect(camera.fov).toBe(normalFov / 3)
    keys = {
      zoom: true,
      sprint: true,
      modifier: true,
    }
    frame()
    expect(camera.fov).toBe(normalFov)
    keys = {
      zoom: true,
      sprint: true,
    }
    frame()
    expect(camera.fov).toBe(normalFov / 3)
    ownerDocument.pointerLockElement = null
    frame()
    expect(camera.fov).toBe(normalFov)
    ownerDocument.pointerLockElement = canvas
    frame()
    expect(camera.fov).toBe(normalFov / 3)
    enabled = false
    frame()
    expect(camera.fov).toBe(normalFov)
    enabled = true
    frame()
    expect(camera.fov).toBe(normalFov / 3)
    cameraEnabled = false
    frame()
    expect(camera.fov).toBe(normalFov)
    cameraEnabled = true
    frame()
    expect(camera.fov).toBe(normalFov / 3)
    const beforeRelease = transitions.length
    handle.releaseZoom()
    expect(transitions).toHaveLength(beforeRelease)
    expect(camera.fov).toBe(normalFov)
    expect(zoomAmounts.at(-1)).toBe(0)
    frame()
    expect(camera.fov).toBe(normalFov / 3)
    const body = handle.body
    await act(async () => root.render(render({
      casualZoomFactor: 3,
      extendedZoomFactor: 6,
    })))
    expect(player.current!.body).toBe(body)
    frame()
    expect(camera.fov).toBe(normalFov / 6)
    keys = {zoom: true}
    frame()
    expect(camera.fov).toBe(normalFov / 3)
    await act(async () => root.render(render({
      casualZoomFactor: undefined,
      extendedZoomFactor: undefined,
    })))
    frame()
    expect(camera.fov).toBe(normalFov / 2)
    keys = {}
    frame()
    expect(camera.fov).toBe(normalFov)
    // Omitting durations restores the defaults; real Fiber frames drive the eased FOV.
    await act(async () => root.render(render({
      casualZoomTransition: undefined,
      extendedZoomTransition: undefined,
    })))
    keys = {zoom: true}
    frame(0)
    expect(camera.fov).toBe(normalFov)
    frame(0.05)
    expect(camera.fov).toBeCloseTo(normalFov * (1 - 0.5 * 0.015625), 8)
    frame(0.05)
    expect(camera.fov).toBeCloseTo(normalFov * 0.75, 8)
    frame(0.1)
    expect(camera.fov).toBeCloseTo(normalFov / 2, 8)
    keys = {
      zoom: true,
      sprint: true,
    }
    frame(0)
    frame(0.05)
    expect(camera.fov).toBeCloseTo(normalFov / 2 - normalFov / 6 * 0.015625, 8)
    frame(0.05)
    expect(camera.fov).toBeCloseTo(normalFov * 5 / 12, 8)
    frame(0.1)
    expect(camera.fov).toBeCloseTo(normalFov / 3, 8)
    keys = {
      zoom: true,
      sprint: true,
      forward: true,
    }
    frame(0)
    const beforeSprint = handle.body!.translation().z
    tick()
    expect(handle.body!.translation().z).toBeLessThan(beforeSprint)
    expect(camera.fov).toBeGreaterThan(normalFov / 3)
    expect(camera.fov).toBeLessThan(normalFov / 2)
    // Sprint acceleration proceeds while the extended-zoom retraction is still animating.
    tick(90)
    expect(Math.abs(handle.getState()!.velocity.z)).toBeCloseTo(defaultEgoOptions.speed * defaultEgoOptions.sprintFactor, 3)
    expect(camera.fov).toBe(normalFov / 2)
    keys = {
      zoom: true,
      sprint: true,
    }
    tick(90)
    expect(camera.fov).toBe(normalFov / 3)
    expect(zoomAmounts.every(amount => amount >= 0 && amount <= 1)).toBe(true)
    await act(async () => root.render(render({}, false)))
    expect(camera.fov).toBe(normalFov)
    expect(zoomAmounts.at(-1)).toBe(0)
  } finally {
    await act(async () => root.unmount())
    if (previousActEnvironment) {
      Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', previousActEnvironment)
    } else {
      Reflect.deleteProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT')
    }
  }
})
