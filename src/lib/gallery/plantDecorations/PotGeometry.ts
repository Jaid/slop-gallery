import type {PotKind} from './catalog.ts'
import type {BufferGeometry} from 'three/webgpu'

import {CylinderGeometry, LatheGeometry, TorusGeometry, Vector2} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'
import {potDefinition} from './catalog.ts'

type Profile = Array<[number, number]>
const profiles: Record<PotKind, Profile> = {
  atelier: [[0, 0], [0.235, 0], [0.25, 0.025], [0.26, 0.08], [0.335, 0.58], [0.36, 0.59], [0.37, 0.615], [0.369, 0.65], [0.354, 0.67], [0.327, 0.67], [0.313, 0.65], [0.31, 0.59], [0.222, 0.065], [0, 0.065]],
  ivory: [[0, 0], [0.268, 0], [0.286, 0.03], [0.302, 0.085], [0.31, 0.25], [0.319, 0.45], [0.326, 0.6], [0.33, 0.68], [0.34, 0.73], [0.337, 0.752], [0.324, 0.76], [0.297, 0.76], [0.292, 0.74], [0.286, 0.08], [0, 0.08]],
  celadon: [[0, 0], [0.24, 0], [0.26, 0.03], [0.31, 0.07], [0.365, 0.15], [0.393, 0.24], [0.4, 0.31], [0.387, 0.39], [0.357, 0.47], [0.337, 0.5], [0.32, 0.51], [0.306, 0.5], [0.3, 0.477], [0.324, 0.43], [0.353, 0.34], [0.355, 0.25], [0.32, 0.14], [0.24, 0.065], [0, 0.065]],
  noir: [[0, 0.13], [0.22, 0.13], [0.24, 0.155], [0.252, 0.21], [0.325, 0.75], [0.335, 0.78], [0.326, 0.8], [0.303, 0.8], [0.294, 0.78], [0.215, 0.2], [0, 0.2]],
}
const radialSegments: Record<PotKind, number> = {
  atelier: 96,
  ivory: 200, // Five segments per flute keep all 40 ridges evenly sampled.
  celadon: 96,
  noir: 80,
}

/** Hollow ceramic shells with finished rims; the recessed substrate belongs to the pot. */
export class PotGeometry {
  readonly shell: LatheGeometry
  readonly soil: CylinderGeometry
  readonly trim: BufferGeometry | null
  readonly vertices: Float32Array

  constructor(kind: PotKind) {
    const definition = potDefinition(kind)
    this.shell = new LatheGeometry(profiles[kind].map(point => new Vector2(...point)), radialSegments[kind])
    const positions = this.shell.getAttribute('position')
    const uv = this.shell.getAttribute('uv')
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const y = positions.getY(i)
      const z = positions.getZ(i)
      // Exterior fluting fades into the foot and rolled lip; the soil-facing wall stays smooth.
      if (kind === 'ivory' && Math.hypot(x, z) > 0.3) {
        const radius = Math.hypot(x, z)
        const flute = 0.012 * (0.5 + 0.5 * Math.cos(Math.atan2(x, z) * 40)) * Math.sin(Math.PI * Math.min(1, y / 0.76))
        if (radius > 0) {
          positions.setXYZ(i, x * (1 + flute / radius), y, z * (1 + flute / radius))
        }
      }
      uv.setY(i, y / definition.height)
    }
    this.shell.computeVertexNormals()
    this.shell.computeBoundingBox()
    this.vertices = Float32Array.from(positions.array)
    this.soil = new CylinderGeometry(definition.soilRadius, definition.soilRadius, 0.03, 64).translate(0, definition.soilHeight - 0.015, 0)
    this.trim = kind === 'noir' ? mergeParts([
      new CylinderGeometry(0.22, 0.24, 0.13, 64).translate(0, 0.065, 0),
      new TorusGeometry(0.325, 0.006, 6, 64).rotateX(Math.PI / 2).translate(0, 0.772, 0),
    ]) : null
  }

  dispose() {
    this.shell.dispose()
    this.soil.dispose()
    this.trim?.dispose()
  }
}
