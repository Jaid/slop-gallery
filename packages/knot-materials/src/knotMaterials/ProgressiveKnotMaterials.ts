import type {KnotResourceEntry} from '../KnotResources.ts'
import type KnotMaterial from '../lib/KnotMaterial.ts'
import type {KnotEntry, KnotMaterialLoader} from '../types.ts'
import type {MaterialBinding} from 'three-async-materials'
import type {Camera, Mesh, MeshPhysicalNodeMaterial, MeshStandardNodeMaterial, Texture, WebGPURenderer} from 'three/webgpu'

import AsyncMaterials from 'three-async-materials'
import {Vector3} from 'three/webgpu'

import createPlaceholderMaterial from '../createPlaceholderMaterial.ts'
import LayeredKnotBinding from '../LayeredKnotBinding.ts'
import KnotMaterials from './base/KnotMaterials.ts'

type KnotMaterialEntry = KnotResourceEntry & Pick<KnotEntry, 'placeholder'>
/** one exhibited knot: the mesh showing it and, once its shader arrived, the binding that warms it up */
type Slot = {
  binding?: Pick<MaterialBinding, 'onBeforeRender' | 'ref'>
  mesh: Mesh | null
}

/**
 * Per-entry placeholders and nearest-first material warmup.
 * Each entry’s shader only loads once a mesh shows the knot; until it arrived and warmed up, the knot wears its placeholder.
 * Full entry shaders load in every graphics mode; `heavy` only upgrades the placeholders.
 */
export default class ProgressiveKnotMaterials extends KnotMaterials<KnotMaterialEntry> {
  readonly observers: Array<Mesh['onBeforeRender']>
  readonly placeholderMaterials: Array<MeshStandardNodeMaterial>
  readonly refs: Array<(mesh: Mesh | null) => void>
  private readonly layered = new Map<MeshPhysicalNodeMaterial, LayeredKnotBinding>
  private readonly queue: AsyncMaterials
  private readonly slots: Array<Slot>

  /** `load` hands out each entry’s material class, `environment` replaces the knots’ own studio; the caller keeps owning it. */
  constructor(renderer: WebGPURenderer, camera: Camera, entries: ReadonlyArray<KnotMaterialEntry>, load: KnotMaterialLoader, heavy: boolean, environment?: Texture) {
    super(entries, load, environment)
    // Knottingham exists to review entry shaders, so fast graphics only keeps its placeholders cheap.
    this.placeholderMaterials = entries.map(entry => {
      const material = createPlaceholderMaterial(entry.placeholder, heavy, heavy ? this.environment : undefined)
      material.name = `${entry.id} ${entry.placeholder.shading} placeholder`
      return material
    })
    this.slots = entries.map(() => ({mesh: null}))
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
    return this.entries.filter((entry, index) => this.slots[index].mesh && (this.isLoading(index) || compiling.has(entry.id))).map(entry => entry.id)
  }

  protected override async release() {
    // The queue never owns these resources; keep full materials alive until compilation stops.
    await this.queue.disposeAsync()
    for (const layered of new Set(this.layered.values())) {
      layered.dispose()
    }
    this.layered.clear()
    await super.release()
    for (const material of this.placeholderMaterials) {
      material.dispose()
    }
  }

  /** Lets the queue warm the full material up on the entry’s mesh, together with its core if it has one. */
  protected wear(index: number, material: KnotMaterial) {
    const slot = this.slots[index]
    if (material.coreMaterial) {
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
}
