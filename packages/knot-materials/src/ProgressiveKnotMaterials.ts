import type {KnotResourceEntry} from './KnotResources.ts'
import type {KnotEntry, KnotMaterialLoader} from './types.ts'
import type {MaterialBinding} from 'three-async-materials'
import type {Camera, Mesh, MeshPhysicalNodeMaterial, MeshStandardNodeMaterial, Texture, WebGPURenderer} from 'three/webgpu'

import AsyncMaterials from 'three-async-materials'
import {Vector3} from 'three/webgpu'

import createPlaceholderMaterial from './createPlaceholderMaterial.ts'
import KnotResources from './KnotResources.ts'
import LayeredKnotBinding from './LayeredKnotBinding.ts'
import KnotMaterial from './lib/KnotMaterial.ts'
import StudioEnvironment from './StudioEnvironment.ts'

type KnotMaterialEntry = KnotResourceEntry & Pick<KnotEntry, 'placeholder'>
/** one exhibited knot: the mesh showing it and, once its shader arrived, the binding that warms it up */
type Slot = {
  binding?: Pick<MaterialBinding, 'onBeforeRender' | 'ref'>
  entry: KnotMaterialEntry
  /** whether its shader has been asked for */
  loading: boolean
  mesh: Mesh | null
}

/**
 * Gallery ownership, per-entry placeholders and nearest-first material warmup.
 * Each entry’s shader only loads once a mesh shows the knot, so a scene downloads the shaders of the knots it holds and no others; until it arrived and warmed up, the knot wears its placeholder.
 * Full entry shaders load in every graphics mode; `heavy` only upgrades the placeholders.
 */
export default class ProgressiveKnotMaterials {
  /** the full materials of the knots whose shaders have arrived, by entry index */
  readonly fullMaterials: Array<MeshPhysicalNodeMaterial | undefined>
  readonly observers: Array<Mesh['onBeforeRender']>
  readonly placeholderMaterials: Array<MeshStandardNodeMaterial>
  readonly refs: Array<(mesh: Mesh | null) => void>
  readonly resources: KnotResources
  private disposal?: Promise<void>
  private disposed = false
  private readonly environment: Texture
  private readonly layered = new Map<MeshPhysicalNodeMaterial, LayeredKnotBinding>
  /** the studio this instance made and disposes, absent when the caller passed an environment of its own */
  private readonly ownEnvironment?: StudioEnvironment
  private readonly queue: AsyncMaterials
  private readonly slots: Array<Slot>

  /** `load` hands out each entry’s material class, `environment` replaces the knots’ own studio; the caller keeps owning it. */
  constructor(renderer: WebGPURenderer, camera: Camera, entries: ReadonlyArray<KnotMaterialEntry>, private readonly load: KnotMaterialLoader, heavy: boolean, environment?: Texture) {
    this.resources = new KnotResources(entries)
    // Knottingham exists to review entry shaders, so fast graphics only keeps its placeholders cheap.
    this.ownEnvironment = environment ? undefined : new StudioEnvironment
    this.environment = environment ?? this.ownEnvironment!
    this.placeholderMaterials = entries.map(entry => {
      const material = createPlaceholderMaterial(entry.placeholder, heavy, heavy ? this.environment : undefined)
      material.name = `${entry.id} ${entry.placeholder.shading} placeholder`
      return material
    })
    this.fullMaterials = Array.from<MeshPhysicalNodeMaterial | undefined>({length: entries.length})
    this.slots = entries.map(entry => ({
      entry,
      loading: false,
      mesh: null,
    }))
    const eye = new Vector3
    const position = new Vector3
    this.queue = new AsyncMaterials(renderer, {
      priority(mesh) {
        // Live player position, including after movement or teleport offscreen.
        eye.setFromMatrixPosition(camera.matrixWorld)
        position.setFromMatrixPosition(mesh.matrixWorld)
        return position.distanceToSquared(eye)
      },
      onSettled: result => {
        const {material, startedAt, contexts, status, error} = result
        this.layered.get(material as MeshPhysicalNodeMaterial)?.settled(result)
        if (status === 'failed') {
          console.error('Knot material compilation failed:', material.name, error)
        }
        performance.measure('knot.material.compile', {
          start: startedAt,
          detail: {
            id: material.name,
            contexts,
            status,
          },
        })
      },
    })
    this.refs = this.slots.map((slot, index) => mesh => {
      slot.mesh = mesh
      if (mesh) {
        this.request(index)
      }
      slot.binding?.ref(mesh)
    })
    this.observers = this.slots.map(slot => function (this: Mesh, ...parameters: Parameters<Mesh['onBeforeRender']>) {
      slot.binding?.onBeforeRender.call(this, ...parameters)
    })
  }

  /** the ids of the shown knots that still wear their placeholder: their shader is still downloading, or their full material warms up after the knot was rendered */
  get pendingMaterials() {
    const compiling = new Set(this.queue.pendingMaterials.map(material => material.name))
    return this.slots.filter(slot => slot.mesh && (!slot.binding || compiling.has(slot.entry.id))).map(slot => slot.entry.id)
  }

  dispose() {
    if (!this.disposal) {
      this.disposed = true
      this.disposal = this.release()
      this.disposal.catch(error => console.error('Knot material disposal failed:', error))
    }
  }

  async disposeAsync() {
    this.dispose()
    await this.disposal
  }

  /** Creates the entry’s full material from its class and lets the queue warm it up on the entry’s mesh. */
  private bind(index: number, Material: Awaited<ReturnType<KnotMaterialLoader>>) {
    const slot = this.slots[index]
    const material = new Material(this.environment)
    material.name = slot.entry.id
    this.fullMaterials[index] = material
    if (material instanceof KnotMaterial && material.coreMaterial) {
      const layered = new LayeredKnotBinding(this.queue, material, material.coreMaterial)
      this.layered.set(material, layered)
      this.layered.set(material.coreMaterial, layered)
      slot.binding = {
        ref: (mesh: Mesh | null) => layered.ref(mesh),
        onBeforeRender: layered.binding.onBeforeRender,
      }
    } else {
      slot.binding = this.queue.add(material)
    }
    slot.binding.ref(slot.mesh)
  }

  private async release() {
    // The queue never owns these resources; keep full materials alive until compilation stops.
    await this.queue.disposeAsync()
    for (const layered of new Set(this.layered.values())) {
      layered.dispose()
    }
    this.layered.clear()
    this.resources.dispose()
    for (const material of this.fullMaterials) {
      material?.dispose()
    }
    this.ownEnvironment?.dispose()
    for (const material of this.placeholderMaterials) {
      material.dispose()
    }
  }

  /** Asks for the entry’s shader once; a class at hand binds right away, one still downloading once it arrives, unless this was disposed meanwhile. */
  private request(index: number) {
    const slot = this.slots[index]
    if (slot.loading || this.disposed) {
      return
    }
    slot.loading = true
    let loaded: ReturnType<KnotMaterialLoader>
    try {
      loaded = this.load(slot.entry)
    } catch (error) {
      console.error('Knot material could not be loaded:', slot.entry.id, error)
      return
    }
    const fail = (error: unknown) => console.error('Knot material could not be loaded:', slot.entry.id, error)
    if (!(loaded instanceof Promise)) {
      try {
        this.bind(index, loaded)
      } catch (error) {
        fail(error)
      }
      return
    }
    loaded.then(Material => {
      if (!this.disposed) {
        this.bind(index, Material)
      }
    }).catch(fail)
  }
}
