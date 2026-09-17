import type {KnotResourceEntry} from './KnotResources.ts'
import type {KnotEntry, KnotMaterialConstructor} from './types.ts'
import type {Camera, Mesh, MeshPhysicalNodeMaterial, MeshStandardNodeMaterial, WebGPURenderer} from 'three/webgpu'

import AsyncMaterials from 'three-async-materials'
import {Vector3} from 'three/webgpu'

import createPlaceholderMaterial from './createPlaceholderMaterial.ts'
import KnotResources from './KnotResources.ts'
import StudioEnvironment from './StudioEnvironment.ts'

type KnotMaterialEntry = KnotResourceEntry & Pick<KnotEntry, 'placeholder'>

function noopRef(_mesh: Mesh | null) {}
function noopRender(this: Mesh) {}
function repeat<Value>(value: Value, count: number) {
  return Array.from({length: count}, () => value)
}

/** Gallery ownership, per-entry placeholders and nearest-first material warmup. */
export default class ProgressiveKnotMaterials {
  readonly fullMaterials: Array<MeshPhysicalNodeMaterial>
  readonly observers: Array<Mesh['onBeforeRender']>
  readonly placeholderMaterials: Array<MeshStandardNodeMaterial>
  readonly refs: Array<(mesh: Mesh | null) => void>
  readonly resources: KnotResources
  private disposal?: Promise<void>
  private readonly environment?: StudioEnvironment
  private readonly queue?: AsyncMaterials

  constructor(renderer: WebGPURenderer, camera: Camera, entries: ReadonlyArray<KnotMaterialEntry>, constructors: ReadonlyMap<string, KnotMaterialConstructor>, quality: boolean) {
    this.resources = new KnotResources(entries)
    const environment = quality ? new StudioEnvironment : undefined
    this.placeholderMaterials = entries.map(entry => {
      const material = createPlaceholderMaterial(entry.placeholder, quality, environment)
      material.name = `${entry.id} ${entry.placeholder.shading} placeholder`
      return material
    })
    if (!quality) {
      this.fullMaterials = []
      this.refs = repeat(noopRef, entries.length)
      this.observers = repeat(noopRender, entries.length)
      return
    }
    const fullMaterials: Array<MeshPhysicalNodeMaterial> = []
    try {
      for (const entry of entries) {
        const Material = constructors.get(entry.id)
        if (!Material) {
          throw new Error(`Missing material constructor for ${entry.id}.`)
        }
        const material = new Material(environment!)
        material.name = entry.id
        fullMaterials.push(material)
      }
    } catch (error) {
      for (const material of fullMaterials) {
        material.dispose()
      }
      environment!.dispose()
      for (const material of this.placeholderMaterials) {
        material.dispose()
      }
      this.resources.dispose()
      throw error
    }
    this.environment = environment
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
      onSettled({material, startedAt, contexts, status, error}) {
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
    const bindings = this.fullMaterials.map(material => this.queue!.add(material))
    this.refs = bindings.map(binding => binding.ref)
    this.observers = bindings.map(binding => binding.onBeforeRender)
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
    await this.queue?.disposeAsync()
    this.resources.dispose()
    for (const material of this.fullMaterials) {
      material.dispose()
    }
    this.environment?.dispose()
    for (const material of this.placeholderMaterials) {
      material.dispose()
    }
  }
}
