import type {KnotResourceEntry} from './KnotResources.ts'
import type {KnotMaterialConstructor} from './types.ts'
import type {Camera, Mesh, Scene, WebGPURenderer} from 'three/webgpu'

import {MeshStandardNodeMaterial, Vector3} from 'three/webgpu'

import KnotResources from './KnotResources.ts'

type Context = {
  camera: Camera
  mrt: ReturnType<WebGPURenderer['getMRT']>
  output: ReturnType<WebGPURenderer['getOutputRenderTarget']>
  scene: Scene
  target: ReturnType<WebGPURenderer['getRenderTarget']>
}
type Pending = {
  contexts: Array<Context>
  failed: boolean
  index: number
  mesh: Mesh | null
  ready: boolean
}

/** Observe real render contexts, then warm one full material at a time outside render(). */
export default class ProgressiveKnotMaterials {
  readonly observers: Array<Mesh['onBeforeRender']>
  readonly placeholder = new MeshStandardNodeMaterial({
    color: '#687078',
    roughness: 0.8,
  })
  readonly refs: Array<(mesh: Mesh | null) => void>
  readonly resources: KnotResources
  private readonly disposal = Promise.withResolvers<void>()
  private disposed = false
  private readonly eye = new Vector3
  private readonly pending: Array<Pending>
  private readonly position = new Vector3
  private released = false
  private running = false
  private scheduled = false

  constructor(private readonly renderer: WebGPURenderer, private readonly camera: Camera, entries: ReadonlyArray<KnotResourceEntry>, constructors: ReadonlyMap<string, KnotMaterialConstructor>) {
    this.resources = new KnotResources(entries, constructors)
    this.placeholder.name = 'Knot material loading placeholder'
    this.pending = entries.map((_, index) => ({
      index,
      mesh: null,
      contexts: [],
      ready: false,
      failed: false,
    }))
    this.refs = this.pending.map(item => mesh => {
      item.mesh = mesh
      if (mesh && item.ready) {
        mesh.material = this.resources.items[item.index].material
      }
    })
    this.observers = this.pending.map(item => (_renderer, scene, camera) => {
      if (this.disposed || item.ready || item.failed || !item.mesh) {
        return
      }
      const target = renderer.getRenderTarget()
      const output = renderer.getOutputRenderTarget()
      const mrt = renderer.getMRT()
      let context = item.contexts.find(candidate => candidate.camera === camera && candidate.scene === scene && candidate.target === target && candidate.output === output && candidate.mrt === mrt)
      if (!context) {
        context = {
          camera,
          scene,
          target,
          output,
          mrt,
        }
        item.contexts.push(context)
      }
      this.schedule()
    })
  }

  dispose() {
    this.disposed = true
    // Node building and native pipeline creation cannot be aborted. Their geometry,
    // materials and environment must outlive the in-flight compile.
    if (!this.running) {
      this.release()
    }
  }

  async disposeAsync() {
    this.dispose()
    await this.disposal.promise
  }

  private compile(item: Pending, context: Context) {
    const mesh = item.mesh!
    const {renderer} = this
    const material = mesh.material
    const visible = mesh.visible
    const culled = mesh.frustumCulled
    const target = renderer.getRenderTarget()
    const output = renderer.getOutputRenderTarget()
    const mrt = renderer.getMRT()
    try {
      renderer.setRenderTarget(context.target)
      renderer.setOutputRenderTarget(context.output)
      renderer.setMRT(context.mrt)
      mesh.material = this.resources.items[item.index].material
      mesh.visible = true
      mesh.frustumCulled = false
      // The renderer is initialized: observation only occurs during a real render.
      // r186 captures material/context synchronously before its first await and
      // restores its render traversal before asynchronous node/pipeline building.
      return renderer.compileAsync(mesh, context.camera, context.scene)
    } finally {
      // Never leak temporary material or renderer state across an await/frame.
      mesh.material = material
      mesh.visible = visible
      mesh.frustumCulled = culled
      renderer.setMRT(mrt)
      renderer.setOutputRenderTarget(output)
      renderer.setRenderTarget(target)
    }
  }

  private release() {
    if (this.released) {
      return
    }
    this.released = true
    this.resources.dispose()
    this.placeholder.dispose()
    this.disposal.resolve()
  }

  private async run() {
    const cancelled = () => this.disposed
    this.running = true
    try {
      while (!cancelled()) {
        // Read the current player position even for previously visible objects now
        // outside the frustum. Never retain stale distances after movement/teleport.
        this.eye.setFromMatrixPosition(this.camera.matrixWorld)
        let next: Pending | undefined
        let nearest = Infinity
        for (const item of this.pending) {
          if (!item.mesh || item.ready || item.failed || item.contexts.length === 0) {
            continue
          }
          this.position.setFromMatrixPosition(item.mesh.matrixWorld)
          const distance = this.position.distanceToSquared(this.eye)
          if (distance < nearest) {
            nearest = distance
            next = item
          }
        }
        if (!next) {
          break
        }
        const start = performance.now()
        try {
          // Array iteration also visits contexts first observed while this item warms.
          for (const context of next.contexts) {
            if (cancelled() || !next.mesh) {
              break
            }
            await this.compile(next, context)
          }
          if (!cancelled() && next.mesh) {
            next.ready = true
            next.mesh.material = this.resources.items[next.index].material
          }
        } catch (error) {
          next.failed = true
          if (!cancelled()) {
            console.error('Knot material compilation failed:', this.resources.items[next.index].material.name, error)
          }
        } finally {
          let status = 'ready'
          if (cancelled() || !next.mesh) {
            status = 'cancelled'
          } else if (next.failed) {
            status = 'failed'
          }
          performance.measure('knot.material.compile', {
            start,
            detail: {
              id: this.resources.items[next.index].material.name,
              contexts: next.contexts.length,
              status,
            },
          })
        }
      }
    } finally {
      this.running = false
      if (cancelled()) {
        this.release()
      }
    }
  }

  private schedule() {
    if (this.scheduled || this.running || this.disposed) {
      return
    }
    this.scheduled = true
    queueMicrotask(() => {
      this.scheduled = false
      if (!this.disposed) {
        this.run().catch(error => console.error('Knot material warmup failed:', error))
      }
    })
  }
}
