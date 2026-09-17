import type {Texture, WebGPURenderer} from 'three/webgpu'

import {expect, test} from 'bun:test'

import RetainedLifetime from 'disposable-lifetime'
import {Color, Mesh, PerspectiveCamera, RenderTarget, Scene} from 'three/webgpu'

import KnotMaterial from '../../src/lib/knots/base/KnotMaterial.ts'
import {knotsById} from '../../src/lib/knots/index.ts'
import ProgressiveKnotMaterials from '../../src/lib/knots/ProgressiveKnotMaterials.ts'

function fixture(third = false) {
  class TestMaterial extends KnotMaterial {}
  const entry = knotsById.get('gpt_astra/lenticular_mirage')!
  const entries = [
    entry,
    {
      ...entry,
      id: 'near',
    },
  ]
  if (third) {
    entries.push({
      ...entry,
      id: 'third',
    })
  }
  const scene = new Scene
  const camera = new PerspectiveCamera
  const main = new RenderTarget
  const reflection = new RenderTarget
  let target: RenderTarget | null = null
  let output: RenderTarget | null = null
  let mrt: ReturnType<WebGPURenderer['getMRT']> | null = null
  const calls: Array<{
    gate: ReturnType<typeof Promise.withResolvers<void>>
    material: unknown
    mesh: Mesh
    target: RenderTarget | null
  }> = []
  const renderer = {
    getRenderTarget: () => target,
    setRenderTarget: (next: RenderTarget | null) => target = next,
    getOutputRenderTarget: () => output,
    setOutputRenderTarget: (next: RenderTarget | null) => output = next,
    getMRT: () => mrt,
    getActiveCubeFace: () => 0,
    getActiveMipmapLevel: () => 0,
    setMRT: (next: typeof mrt) => mrt = next,
    compileAsync(mesh: Mesh) {
      const gate = Promise.withResolvers<void>()
      calls.push({
        gate,
        material: mesh.material,
        mesh,
        target,
      })
      return gate.promise
    },
  }
  const materials = new ProgressiveKnotMaterials(renderer as unknown as WebGPURenderer, camera, entries, new Map(entries.map(item => [item.id, TestMaterial])), true)
  const meshes = materials.resources.items.map(({geometry}, index) => {
    const mesh: Mesh = new Mesh(geometry, materials.flavorMaterials[index])
    mesh.position.z = [-8, -2, -5][index]
    mesh.updateMatrixWorld()
    materials.refs[index](mesh)
    return mesh
  })
  const observe = (index: number, pass = main) => {
    renderer.setRenderTarget(pass)
    materials.observers[index].call(meshes[index], renderer as unknown as Parameters<Mesh['onBeforeRender']>[0], scene, camera, meshes[index].geometry, materials.flavorMaterials[index], null as never)
    renderer.setRenderTarget(null)
  }
  const dispose = () => {
    materials.dispose()
    main.dispose()
    reflection.dispose()
  }
  return {
    materials,
    camera,
    meshes,
    renderer,
    calls,
    observe,
    dispose,
    main,
    reflection,
    entry,
  }
}
async function flush() {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve()
  }
}
test('quality placeholders use transparent ghost materials until full materials are ready', () => {
  const f = fixture()
  try {
    const placeholder = f.materials.flavorMaterials[0]
    expect(placeholder.isMeshStandardNodeMaterial).toBe(true)
    expect(placeholder.transparent).toBe(true)
    expect(placeholder.opacity).toBe(0.34)
    expect(placeholder.metalness).toBe(0.06)
    expect(placeholder.roughness).toBe(0.18)
    expect(f.meshes[0].material).toBe(placeholder)
  } finally {
    f.dispose()
  }
})
test('unmount waits for in-flight compilation before releasing resources and never activates late results', async () => {
  const f = fixture()
  let releases = 0
  f.materials.resources.items[0].geometry.addEventListener('dispose', () => releases++)
  f.observe(0)
  await flush()
  f.dispose()
  expect(releases).toBe(0)
  f.calls[0].gate.resolve()
  await flush()
  expect(releases).toBe(1)
  expect(f.meshes[0].material).toBe(f.materials.flavorMaterials[0])
  f.dispose()
  expect(releases).toBe(1)
  expect(f.calls).toHaveLength(1)
})
test('effect replay neither restarts compilation nor disposes its live resources', async () => {
  const f = fixture()
  const lifetime = new RetainedLifetime(() => f.materials.dispose())
  const first = lifetime.retain()
  f.observe(0)
  first[Symbol.dispose]()
  const replay = lifetime.retain()
  await flush()
  expect(f.calls).toHaveLength(1)
  f.calls[0].gate.resolve()
  await flush()
  expect(f.meshes[0].material).toBe(f.materials.fullMaterials[0])
  replay[Symbol.dispose]()
  await f.materials.disposeAsync()
  f.dispose()
})
test('moving the player reprioritizes queued meshes without needing another visibility observation', async () => {
  const f = fixture(true)
  try {
    f.observe(0)
    f.observe(1)
    f.observe(2)
    await flush()
    expect(f.calls[0].mesh).toBe(f.meshes[1])
    f.camera.position.z = -9
    f.camera.updateMatrixWorld()
    f.calls[0].gate.resolve()
    await flush()
    expect(f.calls[1].mesh).toBe(f.meshes[0])
    f.calls[1].gate.resolve()
    await flush()
    expect(f.calls[2].mesh).toBe(f.meshes[2])
    f.calls[2].gate.resolve()
    await flush()
  } finally {
    f.dispose()
  }
})
test('performance mode keeps only lit flavor-color materials and never constructs full knot materials', async () => {
  const entry = knotsById.get('gpt_astra/lenticular_mirage')!
  let constructions = 0
  class TrackedMaterial extends KnotMaterial {
    constructor(environment: Texture) {
      constructions++
      super(environment)
    }
  }
  const materials = new ProgressiveKnotMaterials({} as WebGPURenderer, new PerspectiveCamera, [entry], new Map([[entry.id, TrackedMaterial]]), false)
  try {
    expect(constructions).toBe(0)
    expect(materials.fullMaterials).toHaveLength(0)
    expect(materials.flavorMaterials).toHaveLength(1)
    const surface = materials.flavorMaterials[0]
    expect(surface.isMeshStandardNodeMaterial).toBe(true)
    expect(surface.color.getHexString()).toBe(new Color(entry.accent).getHexString())
    expect(surface.metalness).toBe(0)
    expect(surface.roughness).toBe(0.72)
  } finally {
    await materials.disposeAsync()
  }
})
