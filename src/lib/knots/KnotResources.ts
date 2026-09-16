import type {KnotEntry, KnotMaterialConstructor} from './types.ts'
import type {BufferGeometry, Mesh, MeshPhysicalNodeMaterial} from 'three/webgpu'

import {MeshBVH} from 'three-mesh-bvh'
import {Vector3} from 'three/webgpu'

import {createKnotGeometry} from '../gallery/sculptures.ts'
import StudioEnvironment from '../materials/StudioEnvironment.ts'

export type KnotResourceEntry = Pick<KnotEntry, 'displacement' | 'id'>

export default class KnotResources {
  readonly environment = new StudioEnvironment
  readonly items: Array<{
    colliderArgs: [number, number, number]
    colliderPosition: [number, number, number]
    geometry: BufferGeometry
    material: MeshPhysicalNodeMaterial
  }>
  readonly raycast: Mesh['raycast']
  private readonly geometries = new Map<number, BufferGeometry>
  private readonly materials: Array<MeshPhysicalNodeMaterial> = []
  constructor(entries: ReadonlyArray<KnotResourceEntry>, constructors: ReadonlyMap<string, KnotMaterialConstructor>) {
    try {
      const base = createKnotGeometry()
      base.computeBoundingSphere()
      this.geometries.set(0, base)
      // All displacement variants have identical CPU triangles. One indirect tree
      // preserves index/face identities and the expanded culling/collider bounds.
      const bounds = new MeshBVH(base, {
        indirect: true,
        setBoundingBox: false,
      })
      this.raycast = function (this: Mesh, raycaster, intersects) {
        bounds.raycastObject3D(this, raycaster, intersects)
      }
      this.items = entries.map(entry => {
        const displacement = entry.displacement ?? 0
        let geometry = this.geometries.get(displacement)
        if (!geometry) {
          geometry = base.clone()
          geometry.boundingBox!.expandByScalar(displacement)
          geometry.computeBoundingSphere()
          geometry.boundingSphere!.radius += displacement
          this.geometries.set(displacement, geometry)
        }
        const Material = constructors.get(entry.id)
        if (!Material) {
          throw new Error(`Missing material constructor for ${entry.id}.`)
        }
        const material = new Material(this.environment)
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
