import type {Vec3} from '../../types.ts'
import type {BufferGeometry} from 'three/webgpu'

import {triangleCount} from '../../../geometry.ts'

export type DestructibleLeaf = {
  geometry: BufferGeometry
  id: string
  mass: number
  position: Vec3
  rotation: Vec3
  stem: BufferGeometry | null
  stemMass: number
  stemVertices: Float32Array | null
  title: string
  vertices: Float32Array
}
export type StemCollider = {mass: number
  vertices: Float32Array}

/** Shared immutable meshes; each mounted specimen owns its attachment state and bodies. */
export default abstract class DestructibleGeometry {
  readonly foliageMaterial: 'foliage' | 'waxyFoliage' = 'waxyFoliage'
  readonly leaves: Array<DestructibleLeaf> = []
  readonly removableRoot: boolean = false
  readonly stemColliders: Array<StemCollider> = []
  readonly stemMaterial: 'stems' | 'wood' = 'stems'
  abstract readonly stems: BufferGeometry

  get triangles() {
    return triangleCount(this.stems) + this.leaves.reduce((sum, leaf) => sum + triangleCount(leaf.geometry) + triangleCount(leaf.stem), 0)
  }

  dispose() {
    this.stems.dispose()
    for (const leaf of this.leaves) {
      leaf.geometry.dispose()
      leaf.stem?.dispose()
    }
  }
}
