import type {MaterialCompilation} from '../src/main.ts'
import type {WebGPURenderer} from 'three/webgpu'

import {expect, spyOn, test} from 'bun:test'

import {output as colorOutput, mrt as makeMrt} from 'three/tsl'
import {BoxGeometry, Mesh, MeshStandardNodeMaterial, PerspectiveCamera, RenderTarget, Scene, Vector3} from 'three/webgpu'

import AsyncMaterials from '../src/main.ts'

function fixture(third = false, prioritized = true) {
  const scene = new Scene
  const camera = new PerspectiveCamera
  const main = new RenderTarget(32, 24)
  main.texture.name = 'main-target'
  const reflection = new RenderTarget(16, 12)
  reflection.texture.name = 'reflection-target'
  const geometry = new BoxGeometry
  const placeholder = new MeshStandardNodeMaterial
  const full = Array.from({length: third ? 3 : 2}, () => new MeshStandardNodeMaterial)
  let target: RenderTarget | null = null
  let output: RenderTarget | null = null
  let mrt: ReturnType<WebGPURenderer['getMRT']> | null = null
  let face = 0
  let mip = 0
  const calls: Array<{
    camera: unknown
    face: number
    gate: ReturnType<typeof Promise.withResolvers<void>>
    material: unknown
    mesh: Mesh
    mip: number
    mrt: ReturnType<WebGPURenderer['getMRT']> | null
    output: RenderTarget | null
    scene: unknown
    target: RenderTarget | null
  }> = []
  const renderer = {
    getRenderTarget: () => target,
    setRenderTarget(next: RenderTarget | null, nextFace = 0, nextMip = 0) {
      target = next
      face = nextFace
      mip = nextMip
    },
    getOutputRenderTarget: () => output,
    setOutputRenderTarget: (next: RenderTarget | null) => output = next,
    getMRT: () => mrt,
    setMRT: (next: typeof mrt) => mrt = next,
    getActiveCubeFace: () => face,
    getActiveMipmapLevel: () => mip,
    compileAsync(mesh: Mesh, camera: unknown, scene: unknown) {
      const gate = Promise.withResolvers<void>()
      calls.push({
        gate,
        material: mesh.material,
        mesh,
        camera,
        scene,
        target,
        output,
        mrt,
        face,
        mip,
      })
      // Three's WebGPU compileAsync traverses the object synchronously before
      // returning its native-pipeline Promise, including onBeforeRender hooks.
      mesh.onBeforeRender(renderer as unknown as Parameters<Mesh['onBeforeRender']>[0], scene as Scene, camera as PerspectiveCamera, mesh.geometry, mesh.material as never, null as never)
      return gate.promise
    },
  }
  const results: Array<MaterialCompilation> = []
  const position = new Vector3
  const eye = new Vector3
  const options = {
    priority(mesh: Mesh) {
      return position.setFromMatrixPosition(mesh.matrixWorld).distanceToSquared(eye.setFromMatrixPosition(camera.matrixWorld))
    },
    onSettled(result: MaterialCompilation) {
      results.push(result)
    },
  }
  const queue = new AsyncMaterials(renderer as unknown as WebGPURenderer, prioritized ? options : {onSettled: options.onSettled})
  const bindings = full.map(material => queue.add(material))
  const meshes = full.map((_, index) => {
    const mesh = new Mesh(geometry, placeholder)
    mesh.position.z = [-8, -2, -5][index]
    mesh.updateMatrixWorld()
    mesh.onBeforeRender = bindings[index].onBeforeRender
    bindings[index].ref(mesh)
    return mesh
  })
  const observe = (index: number, pass = main) => {
    renderer.setRenderTarget(pass)
    meshes[index].onBeforeRender(renderer as unknown as Parameters<Mesh['onBeforeRender']>[0], scene, camera, geometry, placeholder, null as never)
    renderer.setRenderTarget(null)
  }
  const dispose = async () => {
    queue.dispose()
    for (const {gate} of calls) {
      gate.resolve()
    }
    await queue.disposeAsync()
    geometry.dispose()
    placeholder.dispose()
    for (const material of full) {
      material.dispose()
    }
    main.dispose()
    reflection.dispose()
  }
  return {
    queue,
    bindings,
    full,
    placeholder,
    geometry,
    scene,
    camera,
    meshes,
    renderer,
    calls,
    results,
    options,
    observe,
    dispose,
    main,
    reflection,
  }
}
async function flush() {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve()
  }
}
test('warms nearest first, restores render state synchronously and activates only after every observed context', async () => {
  const f = fixture()
  try {
    f.observe(0)
    f.observe(1)
    f.observe(1, f.reflection)
    await flush()
    expect(f.calls).toHaveLength(1)
    expect(f.calls[0].mesh).toBe(f.meshes[1])
    expect(f.calls[0].material).toBe(f.full[1])
    expect(f.calls[0].target).not.toBe(f.main)
    expect(f.calls[0].target?.texture.name).toBe('main-target')
    expect(f.calls[0].target?.width).toBe(1)
    expect(f.calls[0].target?.height).toBe(1)
    expect(f.renderer.getRenderTarget()).toBeNull()
    expect(f.meshes[1].material).toBe(f.placeholder)
    expect(f.meshes[1].frustumCulled).toBe(true)
    f.calls[0].gate.resolve()
    await flush()
    expect(f.calls).toHaveLength(2)
    expect(f.calls[1].target).not.toBe(f.reflection)
    expect(f.calls[1].target?.texture.name).toBe('reflection-target')
    expect(f.meshes[1].material).toBe(f.placeholder)
    f.calls[1].gate.resolve()
    await flush()
    expect(f.meshes[1].material).toBe(f.full[1])
    expect(f.calls).toHaveLength(3)
    expect(f.calls[2].mesh).toBe(f.meshes[0])
    f.calls[2].gate.resolve()
    await flush()
    expect(f.meshes[0].material).toBe(f.full[0])
  } finally {
    await f.dispose()
  }
})
test('synthetic compile traversal cannot recursively admit scratch targets', async () => {
  const f = fixture()
  try {
    f.observe(0)
    await flush()
    expect(f.calls).toHaveLength(1)
    f.calls[0].gate.resolve()
    await flush()
    expect(f.calls).toHaveLength(1)
    expect(f.results[0]).toMatchObject({
      status: 'ready',
      contexts: 1,
    })
  } finally {
    await f.dispose()
  }
})
test('live target resizing cannot invalidate an in-flight compile target', async () => {
  const f = fixture()
  try {
    f.observe(0)
    await flush()
    expect(f.calls).toHaveLength(1)
    const scratch = f.calls[0].target
    expect(scratch).not.toBe(f.main)
    expect(scratch?.width).toBe(1)
    expect(scratch?.height).toBe(1)
    expect(scratch?.samples).toBe(1)
    expect(f.main.samples).toBe(0)
    f.main.setSize(96, 72)
    f.main.dispose()
    expect(scratch?.width).toBe(1)
    expect(scratch?.height).toBe(1)
    f.calls[0].gate.resolve()
    await flush()
    expect(f.meshes[0].material).toBe(f.full[0])
    expect(f.results[0]).toMatchObject({
      status: 'ready',
      contexts: 1,
    })
  } finally {
    await f.dispose()
  }
})
test('shutdown waits for native work but never disposes caller-owned resources', async () => {
  const f = fixture()
  const released = spyOn(f.geometry, 'dispose')
  const materialReleased = spyOn(f.full[0], 'dispose')
  try {
    f.observe(0)
    await flush()
    let stopped = false
    const shutdown = f.queue.disposeAsync().then(() => stopped = true)
    await flush()
    expect(stopped).toBe(false)
    f.calls[0].gate.resolve()
    await shutdown
    expect(stopped).toBe(true)
    expect(released).not.toHaveBeenCalled()
    expect(materialReleased).not.toHaveBeenCalled()
    expect(f.meshes[0].material).toBe(f.placeholder)
    expect(f.results[0].status).toBe('cancelled')
    expect(() => f.queue.add(f.full[0])).toThrow('disposed')
    await f.queue.disposeAsync()
  } finally {
    released.mockRestore()
    materialReleased.mockRestore()
    await f.dispose()
  }
})
test('disposing before the scheduled microtask skips compilation', async () => {
  const f = fixture()
  f.observe(0)
  await f.dispose()
  await flush()
  expect(f.calls).toHaveLength(0)
})
test('a reflection context observed during compilation is warmed before activation', async () => {
  const f = fixture()
  try {
    f.observe(0)
    await flush()
    f.observe(0, f.reflection)
    f.calls[0].gate.resolve()
    await flush()
    expect(f.calls).toHaveLength(2)
    expect(f.meshes[0].material).toBe(f.placeholder)
    expect(f.calls[1].target).not.toBe(f.reflection)
    expect(f.calls[1].target?.texture.name).toBe('reflection-target')
    f.calls[1].gate.resolve()
    await flush()
    expect(f.meshes[0].material).toBe(f.full[0])
  } finally {
    await f.dispose()
  }
})
test('a failed material retains its placeholder without preventing other materials from loading', async () => {
  const f = fixture()
  try {
    f.observe(0)
    f.observe(1)
    await flush()
    f.calls[0].gate.reject(new Error('Pipeline failed'))
    await flush()
    expect(f.results[0]).toMatchObject({
      status: 'failed',
      material: f.full[1],
    })
    expect(f.meshes[1].material).toBe(f.placeholder)
    expect(f.calls).toHaveLength(2)
    f.calls[1].gate.resolve()
    await flush()
    expect(f.meshes[0].material).toBe(f.full[0])
    f.observe(1)
    await flush()
    expect(f.calls).toHaveLength(2)
  } finally {
    await f.dispose()
  }
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
    await f.dispose()
  }
})
test('default priority preserves registration order rather than distance', async () => {
  const f = fixture(false, false)
  try {
    f.observe(1)
    f.observe(0)
    await flush()
    expect(f.calls[0].mesh).toBe(f.meshes[0])
    f.calls[0].gate.resolve()
    await flush()
    expect(f.calls[1].mesh).toBe(f.meshes[1])
  } finally {
    await f.dispose()
  }
})
test('deduplicates exact contexts and restores targets, MRT, face, mip and mesh flags', async () => {
  const f = fixture()
  const observedMrt = makeMrt({output: colorOutput})
  const previousMrt = makeMrt({output: colorOutput})
  try {
    const mesh = f.meshes[0]
    f.renderer.setRenderTarget(f.main, 2, 1)
    f.renderer.setOutputRenderTarget(f.reflection)
    f.renderer.setMRT(observedMrt)
    for (let i = 0; i < 2; i++) {
      mesh.onBeforeRender(f.renderer as unknown as Parameters<Mesh['onBeforeRender']>[0], f.scene, f.camera, mesh.geometry, f.placeholder, null as never)
    }
    f.renderer.setRenderTarget(f.reflection, 5, 2)
    f.renderer.setOutputRenderTarget(f.main)
    f.renderer.setMRT(previousMrt)
    mesh.visible = false
    await flush()
    expect(f.calls).toHaveLength(1)
    expect(f.calls[0]).toMatchObject({
      mrt: observedMrt,
      face: 2,
      mip: 1,
      camera: f.camera,
      scene: f.scene,
    })
    expect(f.calls[0].target).not.toBe(f.main)
    expect(f.calls[0].target?.texture.name).toBe('main-target')
    expect(f.calls[0].target?.width).toBe(2)
    expect(f.calls[0].target?.height).toBe(2)
    expect(f.calls[0].output).not.toBe(f.reflection)
    expect(f.calls[0].output?.texture.name).toBe('reflection-target')
    expect(f.renderer.getRenderTarget()).toBe(f.reflection)
    expect(f.renderer.getOutputRenderTarget()).toBe(f.main)
    expect(f.renderer.getMRT()).toBe(previousMrt)
    expect(f.renderer.getActiveCubeFace()).toBe(5)
    expect(f.renderer.getActiveMipmapLevel()).toBe(2)
    expect(mesh.visible).toBe(false)
    expect(mesh.frustumCulled).toBe(true)
    expect(mesh.material).toBe(f.placeholder)
    f.calls[0].gate.resolve()
    await flush()
    expect(f.calls).toHaveLength(1)
    expect(f.results[0]).toMatchObject({
      status: 'ready',
      contexts: 1,
    })
  } finally {
    await f.dispose()
  }
})
test('a different MRT on the same camera and target needs another variant', async () => {
  const f = fixture()
  try {
    f.observe(0)
    f.renderer.setMRT(makeMrt({output: colorOutput}))
    f.observe(0)
    f.renderer.setMRT(null)
    await flush()
    f.calls[0].gate.resolve()
    await flush()
    expect(f.calls).toHaveLength(2)
    expect(f.calls[1].mrt).not.toBeNull()
    expect(f.meshes[0].material).toBe(f.placeholder)
  } finally {
    await f.dispose()
  }
})
test('a synchronous compile failure restores state and does not poison the queue', async () => {
  const f = fixture()
  const compile = spyOn(f.renderer, 'compileAsync').mockImplementationOnce(() => {
    throw new Error('Build failed')
  })
  try {
    f.observe(0)
    f.observe(1)
    await flush()
    expect(f.results[0]).toMatchObject({
      status: 'failed',
      material: f.full[1],
    })
    expect(f.renderer.getRenderTarget()).toBeNull()
    expect(f.meshes[1].material).toBe(f.placeholder)
    expect(f.meshes[1].frustumCulled).toBe(true)
    expect(f.calls[0].mesh).toBe(f.meshes[0])
  } finally {
    compile.mockRestore()
    await f.dispose()
  }
})
test('detaching a mesh pauses admission and prevents late activation', async () => {
  const f = fixture()
  try {
    f.observe(0)
    f.bindings[0].ref(null)
    await flush()
    expect(f.calls).toHaveLength(0)
    f.bindings[0].ref(f.meshes[0])
    f.observe(0)
    await flush()
    f.bindings[0].ref(null)
    f.calls[0].gate.resolve()
    await flush()
    expect(f.meshes[0].material).toBe(f.placeholder)
    expect(f.results[0].status).toBe('cancelled')
    f.bindings[0].ref(f.meshes[0])
    f.observe(0)
    await flush()
    f.calls[1].gate.resolve()
    await flush()
    expect(f.meshes[0].material).toBe(f.full[0])
  } finally {
    await f.dispose()
  }
})
test('replacing a bound mesh during compilation cannot activate it with the old mesh contexts', async () => {
  const f = fixture()
  try {
    f.observe(0)
    await flush()
    const previous = f.meshes[0]
    const replacement = new Mesh(f.geometry, f.placeholder)
    replacement.onBeforeRender = f.bindings[0].onBeforeRender
    f.bindings[0].ref(replacement)
    f.meshes[0] = replacement
    f.observe(0, f.reflection)
    f.calls[0].gate.resolve()
    await flush()
    expect(previous.material).toBe(f.placeholder)
    expect(replacement.material).toBe(f.placeholder)
    expect(f.results[0].status).toBe('cancelled')
    expect(f.calls[1].mesh).toBe(replacement)
    expect(f.calls[1].target).not.toBe(f.reflection)
    expect(f.calls[1].target?.texture.name).toBe('reflection-target')
    f.calls[1].gate.resolve()
    await flush()
    expect(replacement.material).toBe(f.full[0])
  } finally {
    await f.dispose()
  }
})
test('synchronous ref replay preserves an in-flight warmup for the same mesh', async () => {
  const f = fixture()
  try {
    f.observe(0)
    await flush()
    f.bindings[0].ref(null)
    f.bindings[0].ref(f.meshes[0])
    f.observe(0)
    f.calls[0].gate.resolve()
    await flush()
    expect(f.calls).toHaveLength(1)
    expect(f.meshes[0].material).toBe(f.full[0])
    f.bindings[0].ref(null)
    f.bindings[0].ref(f.meshes[0])
    expect(f.meshes[0].material).toBe(f.full[0])
  } finally {
    await f.dispose()
  }
})
test('reporting exceptions do not interrupt subsequent materials', async () => {
  const f = fixture()
  const log = spyOn(console, 'error').mockImplementation(() => {})
  f.options.onSettled = () => {
    throw new Error('Reporter failed')
  }
  try {
    f.observe(0)
    f.observe(1)
    await flush()
    f.calls[0].gate.resolve()
    await flush()
    expect(log).toHaveBeenCalledTimes(1)
    expect(f.calls).toHaveLength(2)
    expect(f.meshes[1].material).toBe(f.full[1])
  } finally {
    await f.dispose()
    log.mockRestore()
  }
})
test('invalid priority fails only its binding and reports the reason', async () => {
  const f = fixture()
  f.options.priority = mesh => (mesh === f.meshes[1] ? Number.NaN : 0)
  try {
    f.observe(0)
    f.observe(1)
    await flush()
    expect(f.results[0]).toMatchObject({
      status: 'failed',
      material: f.full[1],
      contexts: 0,
    })
    expect(f.results[0].error).toBeInstanceOf(RangeError)
    expect(f.calls).toHaveLength(1)
    expect(f.calls[0].mesh).toBe(f.meshes[0])
  } finally {
    await f.dispose()
  }
})
test('unseen and foreign-renderer observations do not admit work', async () => {
  const f = fixture()
  try {
    await flush()
    expect(f.calls).toHaveLength(0)
    f.meshes[0].onBeforeRender({} as Parameters<Mesh['onBeforeRender']>[0], f.scene, f.camera, f.geometry, f.placeholder, null as never)
    await flush()
    expect(f.calls).toHaveLength(0)
    f.observe(0)
    await flush()
    expect(f.calls).toHaveLength(1)
  } finally {
    await f.dispose()
  }
})
test('failures are reported by default when no application reporter was supplied', async () => {
  const f = fixture()
  delete (f.options as {onSettled?: unknown}).onSettled
  const log = spyOn(console, 'error').mockImplementation(() => {})
  try {
    f.observe(0)
    await flush()
    const error = new Error('Native compile failed')
    f.calls[0].gate.reject(error)
    await flush()
    expect(log).toHaveBeenCalledWith('Async material compilation failed:', f.full[0].name, error)
    expect(f.meshes[0].material).toBe(f.placeholder)
  } finally {
    await f.dispose()
    log.mockRestore()
  }
})
