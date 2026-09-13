import type {AsyncMaterialsOptions, MaterialBinding, MaterialCompilation} from './types.ts'
import type {Camera, Material, Mesh, Scene, WebGPURenderer} from 'three/webgpu'

type Context = {
  camera: Camera
  face: number
  mip: number
  mrt: ReturnType<WebGPURenderer['getMRT']>
  output: ReturnType<WebGPURenderer['getOutputRenderTarget']>
  scene: Scene
  target: ReturnType<WebGPURenderer['getRenderTarget']>
}
type Pending = {
  attached: boolean
  contexts: Array<Context>
  failed: boolean
  material: Material
  mesh: Mesh | null
  ready: boolean
}

/** One queue per renderer. Caller owns every mesh, material, target and geometry. */
export default class AsyncMaterials {
  private readonly disposal = Promise.withResolvers<void>()
  private disposed = false
  private readonly pending: Array<Pending> = []
  private running = false
  private scheduled = false

  constructor(private readonly renderer: WebGPURenderer, private readonly options: AsyncMaterialsOptions = {}) {}

  add(material: Material): MaterialBinding {
    if (this.disposed) {
      throw new Error('Cannot add materials to a disposed queue.')
    }
    const item: Pending = {
      material,
      mesh: null,
      attached: false,
      contexts: [],
      ready: false,
      failed: false,
    }
    this.pending.push(item)
    const queue = this
    return {
      ref(mesh) {
        if (queue.disposed) {
          return
        }
        item.attached = mesh !== null
        if (mesh && mesh !== item.mesh) {
          item.mesh = mesh
          item.contexts = []
          item.ready = false
          item.failed = false
        }
        if (mesh && item.ready) {
          mesh.material = material
        }
      },
      onBeforeRender(this: Mesh, renderer, scene, camera) {
        // Three's shared hook typings still assume the GL backend, even for WebGPU.
        if (!Object.is(renderer, queue.renderer) || queue.disposed || !item.attached || this !== item.mesh || item.ready || item.failed) {
          return
        }
        const target = queue.renderer.getRenderTarget()
        const output = queue.renderer.getOutputRenderTarget()
        const mrt = queue.renderer.getMRT()
        const face = queue.renderer.getActiveCubeFace()
        const mip = queue.renderer.getActiveMipmapLevel()
        if (!item.contexts.some(context => context.camera === camera && context.scene === scene && context.target === target && context.output === output && context.mrt === mrt && context.face === face && context.mip === mip)) {
          item.contexts.push({
            camera,
            scene,
            target,
            output,
            mrt,
            face,
            mip,
          })
        }
        queue.schedule()
      },
    }
  }

  /** Stop admission and activation immediately; in-flight native work cannot be aborted. */
  dispose() {
    this.disposed = true
    if (!this.running) {
      this.release()
    }
  }

  /** Await before disposing caller-owned resources used by this queue. */
  async disposeAsync() {
    this.dispose()
    await this.disposal.promise
  }

  private compile(mesh: Mesh, fullMaterial: Material, context: Context) {
    const {renderer} = this
    const material = mesh.material
    const visible = mesh.visible
    const culled = mesh.frustumCulled
    const target = renderer.getRenderTarget()
    const output = renderer.getOutputRenderTarget()
    const mrt = renderer.getMRT()
    const face = renderer.getActiveCubeFace()
    const mip = renderer.getActiveMipmapLevel()
    try {
      renderer.setRenderTarget(context.target, context.face, context.mip)
      renderer.setOutputRenderTarget(context.output)
      renderer.setMRT(context.mrt)
      mesh.material = fullMaterial
      mesh.visible = true
      mesh.frustumCulled = false
      // Observation occurs during real rendering, so the renderer is initialized.
      // r186 captures material/context synchronously before its first await and
      // restores traversal before asynchronous node/pipeline building.
      return renderer.compileAsync(mesh, context.camera, context.scene)
    } finally {
      // No temporary state may survive across an await or ordinary render frame.
      mesh.material = material
      mesh.visible = visible
      mesh.frustumCulled = culled
      renderer.setMRT(mrt)
      renderer.setOutputRenderTarget(output)
      renderer.setRenderTarget(target, face, mip)
    }
  }

  private release() {
    this.pending.length = 0
    this.disposal.resolve()
  }

  private report(result: MaterialCompilation) {
    try {
      if (this.options.onSettled) {
        this.options.onSettled(result)
      } else if (result.status === 'failed') {
        console.error('Async material compilation failed:', result.material.name, result.error)
      }
    } catch (error) {
      console.error('Async material reporting failed:', error)
    }
  }

  private async run() {
    // Callbacks may dispose the queue; read afresh after invoking them.
    const disposed = () => this.disposed
    this.running = true
    try {
      while (!disposed()) {
        let next: Pending | undefined
        let nearest = Infinity
        for (const item of this.pending) {
          if (!item.mesh || !item.attached || item.ready || item.failed || item.contexts.length === 0) {
            continue
          }
          try {
            const priority = this.options.priority?.(item.mesh, item.material) ?? 0
            if (!Number.isFinite(priority)) {
              throw new RangeError('Material priority must be finite.')
            }
            if (priority < nearest) {
              nearest = priority
              next = item
            }
          } catch (error) {
            item.failed = true
            this.report({
              material: item.material,
              mesh: item.mesh,
              startedAt: performance.now(),
              contexts: 0,
              status: 'failed',
              error,
            })
          }
        }
        if (!next || disposed()) {
          break
        }
        const mesh = next.mesh!
        const contexts = next.contexts
        const cancelled = () => this.disposed || !next.attached || next.mesh !== mesh || next.contexts !== contexts
        const result: MaterialCompilation = {
          material: next.material,
          mesh,
          startedAt: performance.now(),
          contexts: 0,
          status: 'cancelled',
        }
        try {
          // Includes contexts discovered while this mesh warms. Rebinding replaces
          // the array, and must not activate a different mesh with old variants.
          for (const context of contexts) {
            if (cancelled()) {
              break
            }
            result.contexts++
            await this.compile(mesh, next.material, context)
          }
          if (!cancelled()) {
            next.ready = true
            mesh.material = next.material
            result.status = 'ready'
          }
        } catch (error) {
          if (!cancelled()) {
            next.failed = true
            result.status = 'failed'
            result.error = error
          }
        } finally {
          this.report(result)
        }
      }
    } finally {
      this.running = false
      if (this.disposed) {
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
        this.run().catch(error => console.error('Async material warmup failed:', error))
      }
    })
  }
}
