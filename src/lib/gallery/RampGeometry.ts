import {BufferGeometry, Float32BufferAttribute} from 'three/webgpu'

// A closed triangular prism: the visible slope is also its collision surface.
export default class RampGeometry extends BufferGeometry {
  constructor(width: number, rise: number, run: number) {
    super()
    if (![width, rise, run].every(value => Number.isFinite(value) && value > 0)) {
      throw new RangeError('A ramp needs positive, finite dimensions.')
    }
    const half = width / 2
    const indexed = new BufferGeometry
    indexed.setAttribute('position', new Float32BufferAttribute([
      -half,
      0,
      0,
      half,
      0,
      0,
      -half,
      0,
      -run,
      half,
      0,
      -run,
      -half,
      rise,
      -run,
      half,
      rise,
      -run,
    ], 3))
    indexed.setIndex([
      0,
      1,
      5,
      0,
      5,
      4,
      0,
      2,
      3,
      0,
      3,
      1,
      2,
      4,
      5,
      2,
      5,
      3,
      1,
      3,
      5,
      0,
      4,
      2,
    ])
    const flat = indexed.toNonIndexed()
    this.copy(flat)
    flat.dispose()
    indexed.dispose()
    this.computeVertexNormals()
    this.computeBoundingBox()
    this.computeBoundingSphere()
  }
}
