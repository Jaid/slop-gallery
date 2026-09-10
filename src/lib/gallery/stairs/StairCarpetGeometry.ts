import {ExtrudeGeometry, Shape} from 'three/webgpu'

/** A wide, shallow half-round tread pad, with its straight edge at local z = 0. */
export class StairCarpetGeometry extends ExtrudeGeometry {
  constructor(width: number, radius: number) {
    if (![width, radius].every(Number.isFinite) || width <= 0 || radius <= 0) {
      throw new RangeError('A tread pad needs a positive finite width and depth.')
    }
    const shape = new Shape
    shape.moveTo(radius, 0)
    shape.absarc(0, 0, radius, 0, Math.PI, false)
    shape.closePath()
    super(shape, {
      depth: 0.008,
      bevelEnabled: false,
      curveSegments: 32,
    })
    this.scale(width / (radius * 2), 1, 1)
    this.rotateX(-Math.PI / 2)
    this.computeBoundingBox()
    this.computeBoundingSphere()
  }
}
