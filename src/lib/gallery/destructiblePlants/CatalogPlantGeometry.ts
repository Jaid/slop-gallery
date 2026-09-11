import type {BufferGeometry} from 'three/webgpu'

import {Vector3} from 'three/webgpu'

import {plants} from '../plantDecorations/catalog.ts'
import PlantGeometry from '../plantDecorations/PlantGeometry.ts'
import DestructibleGeometry from './base/DestructibleGeometry.ts'

export type DestructibleCatalogKind = 'calathea' | 'snake'

/** Split the existing recipes without changing a single visible triangle or its shading. */
export default class CatalogPlantGeometry extends DestructibleGeometry {
  override readonly foliageMaterial = 'foliage' as const
  override readonly removableRoot = true
  readonly stems: BufferGeometry

  constructor(readonly kind: DestructibleCatalogKind) {
    super()
    const title = plants.find(plant => plant.id === kind)!.title
    const source = new PlantGeometry(kind, {
      blade: part => {
        const geometry = part.clone()
        geometry.computeBoundingBox()
        const center = geometry.boundingBox!.getCenter(new Vector3)
        // Translate positions only: BufferGeometry.translate also renormalizes normals.
        const positions = geometry.getAttribute('position')
        for (let i = 0; i < positions.count; i++) {
          positions.setXYZ(i, positions.getX(i) - center.x, positions.getY(i) - center.y, positions.getZ(i) - center.z)
        }
        geometry.computeBoundingBox()
        geometry.computeBoundingSphere()
        this.leaves.push({
          id: `leaf-${this.leaves.length}`,
          title: `A ${title.toLowerCase()} leaf`,
          geometry,
          vertices: Float32Array.from(geometry.getAttribute('position').array),
          mass: kind === 'snake' ? 0.025 : 0.008,
          position: center.toArray(),
          rotation: [0, 0, 0],
          stem: null,
          stemVertices: null,
          stemMass: 0,
        })
      },
      branch: part => {
        part.computeBoundingBox()
        const length = part.boundingBox!.getSize(new Vector3).length()
        this.stemColliders.push({
          vertices: Float32Array.from(part.getAttribute('position').array),
          mass: length * 0.003,
        })
      },
    })
    // Transfer the trunk/stems; the temporary merged foliage has no renderer owner.
    this.stems = source.stems
    source.foliage.dispose()
  }
}
