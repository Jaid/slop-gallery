import type {KnotEntry, KnotMaterialConstructor} from './types.ts'
import type {BufferGeometry, MeshPhysicalNodeMaterial} from 'three/webgpu'

import {Vector3} from 'three/webgpu'

import {createKnotGeometry} from '../gallery/sculptures.ts'
import {StudioEnvironment} from '../materials/StudioEnvironment.ts'

export class KnotResources {
  readonly environment = new StudioEnvironment
  readonly items: Array<{colliderArgs: [number, number, number]
    colliderPosition: [number, number, number]
    geometry: BufferGeometry
    material: MeshPhysicalNodeMaterial}>
  private readonly geometries = new Map<number, BufferGeometry>
  private readonly materials: Array<MeshPhysicalNodeMaterial> = []
  constructor(entries: ReadonlyArray<KnotEntry>, constructors: ReadonlyArray<KnotMaterialConstructor>) {
    try {
      if (entries.length !== constructors.length) {
        throw new Error('Every displayed Knot needs a material constructor.')
      }
      const base = createKnotGeometry()
      base.computeBoundingSphere()
      this.geometries.set(0, base)
      this.items = entries.map((entry, index) => {
        const displacement = entry.displacement ?? 0
        let geometry = this.geometries.get(displacement)
        if (!geometry) {
          geometry = base.clone()
          geometry.boundingBox!.expandByScalar(displacement)
          geometry.computeBoundingSphere()
          geometry.boundingSphere!.radius += displacement
          this.geometries.set(displacement, geometry)
        }
        const material = new constructors[index](this.environment)
        this.materials.push(material)
        material.name = entry.id
        return {
          geometry,
          material,
          colliderArgs: geometry.boundingBox!.getSize(new Vector3).multiplyScalar(0.5).toArray(),
          colliderPosition: geometry.boundingBox!.getCenter(new Vector3).toArray(),
        }
      })
    } catch (error) {
      this.dispose()
      throw error
    }
  }
  dispose() {
    for (const geometry of this.geometries.values()) {
      geometry.dispose()
    }
    for (const material of this.materials) {
      material.dispose()
    }
    this.environment.dispose()
  }
}
