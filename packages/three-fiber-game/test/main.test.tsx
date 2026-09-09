import type {Controls, GameProps, GameRenderer, GameWrapperProps, GameWrappers, WebgpuRendererOptions} from '../src/main.ts'
import type {ComponentProps, ReactElement, ReactNode} from 'react'

import {expect, test} from 'bun:test'

import {KeyboardControls} from '@react-three/drei/webgpu'
import {Canvas} from '@react-three/fiber/webgpu'
import {Physics} from '@react-three/rapier'
import {createContext, createRef, isValidElement, useContext} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'

import DefaultGame, {Game as createGame, normalizeControls, WebgpuRenderer} from '../src/main.ts'

function element<Props>(node: ReactNode): ReactElement<Props> {
  if (!isValidElement<Props>(node)) {
    throw new Error('Expected a React element.')
  }
  return node
}
function canvas(props: GameProps = {}) {
  const result = element<ComponentProps<typeof Canvas>>(createGame(props))
  expect(result.type).toBe(Canvas)
  return result
}
function Outer({children}: GameWrapperProps) {
  return <section>{children}</section>
}
function Inner({children}: GameWrapperProps) {
  return <article>{children}</article>
}
test('default and named exports expose the same Game', () => {
  expect(DefaultGame).toBe(createGame)
})
test('compact controls preserve action order, empty bindings and literal key names', () => {
  const controls = Object.freeze({
    forward: Object.freeze(['KeyW', 'ArrowUp']),
    jump: 'Space',
    unbound: Object.freeze([]),
  })
  expect(normalizeControls(controls)).toEqual([
    {
      name: 'forward',
      keys: ['KeyW', 'ArrowUp'],
    },
    {
      name: 'jump',
      keys: ['Space'],
    },
    {
      name: 'unbound',
      keys: [],
    },
  ])
  expect(normalizeControls({})).toEqual([])
})
test('full Drei entries preserve release behavior without exposing caller-owned arrays', () => {
  const entry = Object.freeze({
    name: 'jump',
    keys: Object.freeze(['Space']),
    up: false,
  })
  const controls = Object.freeze([entry])
  const normalized = normalizeControls(controls)
  expect(normalized).toEqual([
    {
      name: 'jump',
      keys: ['Space'],
      up: false,
    },
  ])
  expect(normalized).not.toBe(controls)
  expect(normalized[0]).not.toBe(entry)
  normalized[0]!.keys.push('KeyJ')
  expect(entry.keys).toEqual(['Space'])
  expect(normalizeControls([])).toEqual([])
})
test('record normalization also detaches mutable key arrays', () => {
  const keys = ['Space']
  const normalized = normalizeControls({jump: keys})
  normalized[0]!.keys.push('KeyJ')
  expect(keys).toEqual(['Space'])
})
const onCreated = () => {}
test('Canvas receives children and native props without requiring any gallery provider', () => {
  const children = <group/>
  const camera = {position: [0, 2, 5] as [number, number, number]}
  const ref = createRef<HTMLCanvasElement>()
  const result = canvas({
    children,
    camera,
    ref,
    onCreated,
    shadows: false,
    dpr: 1,
    frameloop: 'demand',
    id: 'game',
  })
  expect(result.props.children).toBe(children)
  expect(result.props.camera).toBe(camera)
  expect(result.props.ref).toBe(ref)
  expect(result.props.onCreated).toBe(onCreated)
  expect(result.props).toMatchObject({
    shadows: false,
    dpr: 1,
    frameloop: 'demand',
    id: 'game',
  })
  expect(result.props).not.toHaveProperty('physics')
  expect(result.props).not.toHaveProperty('controls')
  expect(result.props).not.toHaveProperty('wrapper')
  expect(result.props).not.toHaveProperty('sceneWrapper')
})
test('physics is opt-in and true uses Earth gravity', () => {
  const children = <group/>
  for (const physics of [undefined, false]) {
    expect(canvas({
      children,
      physics,
    }).props.children).toBe(children)
  }
  const world = element<ComponentProps<typeof Physics>>(canvas({
    children,
    physics: true,
  }).props.children)
  expect(world.type).toBe(Physics)
  expect(world.props.gravity).toEqual([0, -9.81, 0])
  expect(world.props.children).toBe(children)
})
test('physics options pass through, including an empty options object', () => {
  const children = <group/>
  const physics = {
    gravity: [0, 0, 0] as [number, number, number],
    paused: true,
    timeStep: 'vary' as const,
  }
  const world = element<ComponentProps<typeof Physics>>(canvas({
    children,
    physics,
  }).props.children)
  expect(world.type).toBe(Physics)
  expect(world.props).toEqual({
    ...physics,
    children,
  })
  expect(element(canvas({physics: {}}).props.children).type).toBe(Physics)
})
test('keyboard controls surround outer wrappers so both render roots can access actions', () => {
  const result = element<ComponentProps<typeof KeyboardControls>>(createGame({
    controls: {jump: 'Space'},
    wrapper: Outer,
  }))
  expect(result.type).toBe(KeyboardControls)
  expect(result.props.map).toEqual([
    {
      name: 'jump',
      keys: ['Space'],
    },
  ])
  const outer = element<GameWrapperProps>(result.props.children)
  expect(outer.type).toBe(Outer)
  expect(element(outer.props.children).type).toBe(Canvas)
})
test('omitted and empty controls skip KeyboardControls without removing supplied wrappers', () => {
  const children = <group/>
  for (const controls of [undefined, Object.freeze({}), Object.freeze([])]) {
    expect(canvas({
      controls,
      children,
    }).props.children).toBe(children)
    const outer = element<GameWrapperProps>(createGame({
      controls,
      children,
      wrapper: Outer,
      sceneWrapper: Inner,
      physics: true,
    }))
    expect(outer.type).toBe(Outer)
    const wrappedCanvas = element<ComponentProps<typeof Canvas>>(outer.props.children)
    expect(wrappedCanvas.type).toBe(Canvas)
    const scene = element<GameWrapperProps>(wrappedCanvas.props.children)
    expect(scene.type).toBe(Inner)
    const world = element<ComponentProps<typeof Physics>>(scene.props.children)
    expect(world.type).toBe(Physics)
    expect(world.props.children).toBe(children)
  }
})
test('declared actions with no assigned keys still provide keyboard state', () => {
  for (const controls of [
    {jump: []}, [
      {
        name: 'jump',
        keys: [],
      },
    ],
  ]) {
    const result = element<ComponentProps<typeof KeyboardControls>>(createGame({controls}))
    expect(result.type).toBe(KeyboardControls)
    expect(result.props.map).toEqual([
      {
        name: 'jump',
        keys: [],
      },
    ])
  }
})
test('single wrappers and readonly lists nest first-to-last without mutating the caller', () => {
  const wrappers = Object.freeze([Outer, Inner]) satisfies GameWrappers
  const result = element<GameWrapperProps>(createGame({wrapper: wrappers}))
  expect(result.type).toBe(Outer)
  const inner = element<GameWrapperProps>(result.props.children)
  expect(inner.type).toBe(Inner)
  expect(element(inner.props.children).type).toBe(Canvas)
  expect(wrappers).toEqual([Outer, Inner])
  expect(element<GameWrapperProps>(createGame({wrapper: Outer})).type).toBe(Outer)
  expect(element(createGame({wrapper: []})).type).toBe(Canvas)
})
test('scene wrappers run inside Canvas but outside Physics', () => {
  const children = <group/>
  const outer = element<GameWrapperProps>(canvas({
    children,
    physics: true,
    sceneWrapper: [Outer, Inner],
  }).props.children)
  expect(outer.type).toBe(Outer)
  const inner = element<GameWrapperProps>(outer.props.children)
  expect(inner.type).toBe(Inner)
  const world = element<ComponentProps<typeof Physics>>(inner.props.children)
  expect(world.type).toBe(Physics)
  expect(world.props.children).toBe(children)
  expect(canvas({
    children,
    sceneWrapper: [],
  }).props.children).toBe(children)
})
const Dependency = createContext('missing')
function Inject({children}: GameWrapperProps) {
  return <Dependency value="injected"><span>before</span>{children}<span>after</span></Dependency>
}
function Consume() {
  return <span>{useContext(Dependency)}</span>
}
test('scene wrappers can inject dependencies and ordered sibling content', () => {
  const scene = canvas({
    sceneWrapper: [Inject, Inner],
    children: <Consume/>,
  }).props.children
  expect(renderToStaticMarkup(scene)).toBe('<span>before</span><article><span>injected</span></article><span>after</span>')
})
test('quality-like prop updates keep renderer and wrapper component identities stable', () => {
  const first = canvas({
    shadows: true,
    dpr: [1, 2],
    sceneWrapper: Inject,
    physics: true,
  })
  const second = canvas({
    shadows: false,
    dpr: 1,
    sceneWrapper: Inject,
    physics: true,
  })
  expect(first.type).toBe(second.type)
  expect(first.key).toBe(second.key)
  expect(first.props.renderer).toBe(second.props.renderer)
  const firstWrapper = element<GameWrapperProps>(first.props.children)
  const secondWrapper = element<GameWrapperProps>(second.props.children)
  expect(firstWrapper.type).toBe(secondWrapper.type)
  expect(firstWrapper.key).toBe(secondWrapper.key)
  expect(element(firstWrapper.props.children).type).toBe(element(secondWrapper.props.children).type)
})
test('renderer customization forwards the factory rather than constructing during render', () => {
  let calls = 0
  const renderer: GameRenderer = options => {
    calls++
    return new WebgpuRenderer({
      ...options,
      antialias: true,
    })
  }
  expect(canvas({renderer}).props.renderer).toBe(renderer)
  expect(calls).toBe(0)
})
test('default renderer is opaque native WebGPU with stable non-multisampled targets', () => {
  const factory = canvas().props.renderer as GameRenderer
  const target = {
    width: 1,
    height: 1,
  } as HTMLCanvasElement
  const renderer = factory({canvas: target}) as WebgpuRenderer
  expect(renderer).toBeInstanceOf(WebgpuRenderer)
  expect(renderer.domElement).toBe(target)
  expect(renderer.backend.isWebGPUBackend).toBe(true)
  expect(renderer.alpha).toBe(false)
  expect(renderer.samples).toBe(0)
})
function RequiresToken(_props: {children: ReactNode
  token: string}) {
  return null
}
test('public types preserve action names and exclude legacy renderer switches', () => {
  const controls: Controls<'jump'> = {jump: 'Space'}
  const props: GameProps<'jump'> = {
    controls,
    sceneWrapper: [Inject],
    physics: {paused: true},
  }
  expect(props.controls).toBe(controls)
  // @ts-expect-error TS2353 Unknown action names are rejected.
  const invalidControls: Controls<'jump'> = {fly: 'KeyF'}
  // @ts-expect-error TS2353 Renderer compatibility switches are not part of the API.
  const invalidRenderer: WebgpuRendererOptions = {forceWebGL: true}
  // @ts-expect-error TS2353 Legacy renderer configuration is not part of Game.
  const invalidProps: GameProps = {gl: {}}
  // @ts-expect-error TS2322 Wrappers must not require additional props.
  const invalidWrapper: GameWrappers = RequiresToken
  expect([invalidControls, invalidRenderer, invalidProps, invalidWrapper]).toHaveLength(4)
})
test('native renderer propagates adapter failure without trying a fallback context', async () => {
  let fallbackCalls = 0
  let contextCalls = 0
  const target = {
    width: 1,
    height: 1,
    getContext: () => {
      contextCalls++
      throw new Error('Unexpected context request.')
    },
  } as unknown as HTMLCanvasElement
  // Exercise runtime behavior even when an untyped caller supplies excluded options.
  const options = {
    canvas: target,
    forceWebGL: true,
    getFallback: () => {
      fallbackCalls++
      throw new Error('Unexpected fallback.')
    },
  }
  const renderer = new WebgpuRenderer(options)
  const failure = new Error('WebGPU adapter unavailable.')
  renderer.backend.init = () => {
    throw failure
  }
  expect(renderer.backend.isWebGPUBackend).toBe(true)
  expect(renderer.isWebGPURenderer).toBe(true)
  await expect(renderer.init()).rejects.toBe(failure)
  expect(fallbackCalls).toBe(0)
  expect(contextCalls).toBe(0)
})
