import type {KnotResourceEntry} from './KnotResources.ts'
import type {KnotMaterialConstructor} from './types.ts'
import type {Camera, Mesh, WebGPURenderer} from 'three/webgpu'

import AsyncMaterials from 'three-async-materials'
import {MeshStandardNodeMaterial, Vector3} from 'three/webgpu'

import KnotResources from './KnotResources.ts'

/** Gallery ownership, placeholders and nearest-first policy; compilation lives in the package. */
export default class ProgressiveKnotMaterials {
  readonly observers: Array<Mesh['onBeforeRender']>
  readonly placeholder = new MeshStandardNodeMaterial({
    color: '#687078',
    roughness: 0.8,
  })
  readonly refs: Array<(mesh: Mesh | null) => void>
  readonly resources: KnotResources
  private disposal?: Promise<void>
  private readonly queue: AsyncMaterials

  constructor(renderer: WebGPURenderer, camera: Camera, entries: ReadonlyArray<KnotResourceEntry>, constructors: ReadonlyMap<string, KnotMaterialConstructor>) {
    this.resources = new KnotResources(entries, constructors)
    this.placeholder.name = 'Knot material loading placeholder'
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
    const bindings = this.resources.items.map(({material}) => this.queue.add(material))
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
    // The queue never owns these resources; keep them alive until compilation stops.
    await this.queue.disposeAsync()
    this.resources.dispose()
    this.placeholder.dispose()
  }
}
