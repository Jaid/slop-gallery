import type {KnotResourceEntry} from './KnotResources.ts'
import type {KnotEntry, KnotMaterialConstructor} from './types.ts'
import type {Camera, Mesh, MeshPhysicalNodeMaterial, MeshStandardNodeMaterial, Texture, WebGPURenderer} from 'three/webgpu'

import AsyncMaterials from 'three-async-materials'
import {Vector3} from 'three/webgpu'

import createPlaceholderMaterial from './createPlaceholderMaterial.ts'
import KnotResources from './KnotResources.ts'
import LayeredKnotBinding from './LayeredKnotBinding.ts'
import KnotMaterial from './lib/KnotMaterial.ts'
import StudioEnvironment from './StudioEnvironment.ts'

type KnotMaterialEntry = KnotResourceEntry & Pick<KnotEntry, 'placeholder'>

/** Gallery ownership, per-entry placeholders and nearest-first material warmup. Full entry shaders load in every graphics mode; `heavy` only upgrades the placeholders. */
export default class ProgressiveKnotMaterials {
  readonly fullMaterials: Array<MeshPhysicalNodeMaterial>
  readonly observers: Array<Mesh['onBeforeRender']>
  readonly placeholderMaterials: Array<MeshStandardNodeMaterial>
  readonly refs: Array<(mesh: Mesh | null) => void>
  readonly resources: KnotResources
  private disposal?: Promise<void>
  private readonly layered = new Map<MeshPhysicalNodeMaterial, LayeredKnotBinding>
  /** the studio this instance made and disposes, absent when the caller passed an environment of its own */
  private readonly ownEnvironment?: StudioEnvironment
  private readonly queue: AsyncMaterials

  /** `environment` replaces the knots’ own studio; the caller keeps owning it. */
  constructor(renderer: WebGPURenderer, camera: Camera, entries: ReadonlyArray<KnotMaterialEntry>, constructors: ReadonlyMap<string, KnotMaterialConstructor>, heavy: boolean, environment?: Texture) {
    this.resources = new KnotResources(entries)
    // Knottingham exists to review entry shaders, so fast graphics only keeps its placeholders cheap.
    const ownEnvironment = environment ? undefined : new StudioEnvironment
    environment ??= ownEnvironment!
    this.placeholderMaterials = entries.map(entry => {
      const material = createPlaceholderMaterial(entry.placeholder, heavy, heavy ? environment : undefined)
      material.name = `${entry.id} ${entry.placeholder.shading} placeholder`
      return material
    })
    const fullMaterials: Array<MeshPhysicalNodeMaterial> = []
    try {
      for (const entry of entries) {
        const Material = constructors.get(entry.id)
        if (!Material) {
          throw new Error(`Missing material constructor for ${entry.id}.`)
        }
        const material = new Material(environment)
        material.name = entry.id
        fullMaterials.push(material)
      }
    } catch (error) {
      for (const material of fullMaterials) {
        material.dispose()
      }
      ownEnvironment?.dispose()
      for (const material of this.placeholderMaterials) {
        material.dispose()
      }
      this.resources.dispose()
      throw error
    }
    this.ownEnvironment = ownEnvironment
    this.fullMaterials = fullMaterials
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
    const bindings = this.fullMaterials.map(material => {
      if (material instanceof KnotMaterial && material.coreMaterial) {
        const layered = new LayeredKnotBinding(this.queue, material, material.coreMaterial)
        this.layered.set(material, layered)
        this.layered.set(material.coreMaterial, layered)
        return {
          ref: (mesh: Mesh | null) => layered.ref(mesh),
          onBeforeRender: layered.binding.onBeforeRender,
        }
      }
      return this.queue.add(material)
    })
    this.refs = bindings.map(binding => binding.ref)
    this.observers = bindings.map(binding => binding.onBeforeRender)
  }

  /** full materials of rendered knots that still warm up and show their placeholder */
  get pendingMaterials() {
    return this.queue.pendingCount
  }

  dispose() {
    if (!this.disposal) {
      this.disposal = this.release()
      this.disposal.catch(error => console.error('Knot material disposal failed:', error))
    }
  }

  async disposeAsync() {
    this.dispose()
    await this.disposal
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
      material.dispose()
    }
    this.ownEnvironment?.dispose()
    for (const material of this.placeholderMaterials) {
      material.dispose()
    }
  }
}
