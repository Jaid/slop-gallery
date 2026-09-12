import type {InstancedMesh, Object3D} from 'three/webgpu'

import {Matrix4} from 'three/webgpu'

/** Keep batched rendering aligned with independently carried, thrown and sleeping props. */
export default class InstancedPropVisuals {
  private readonly inverse = new Matrix4
  private readonly matrix = new Matrix4
  private readonly previous = new Matrix4

  constructor(readonly meshes: ReadonlyArray<InstancedMesh>, readonly ids: ReadonlyArray<string>) {}

  update(resolve: (id: string) => Object3D | undefined) {
    for (const mesh of this.meshes) {
      mesh.updateWorldMatrix(true, false)
      this.inverse.copy(mesh.matrixWorld).invert()
      let updated = false
      for (const [index, id] of this.ids.entries()) {
        const object = resolve(id)
        if (!object) {
          continue
        }
        object.updateWorldMatrix(true, false)
        this.matrix.multiplyMatrices(this.inverse, object.matrixWorld)
        // Instance buffers use float32. Compare at that precision so sleeping props
        // do not trigger uploads and bounding-volume rebuilds on every frame.
        for (let i = 0; i < 16; i++) {
          this.matrix.elements[i] = Math.fround(this.matrix.elements[i])
        }
        mesh.getMatrixAt(index, this.previous)
        if (this.matrix.equals(this.previous)) {
          continue
        }
        mesh.setMatrixAt(index, this.matrix)
        updated = true
      }
      if (updated) {
        mesh.instanceMatrix.needsUpdate = true
        // Thrown objects can leave the initial exhibition bounds.
        mesh.computeBoundingBox()
        mesh.computeBoundingSphere()
      }
    }
  }
}
