import {ExtrudeGeometry, Shape} from 'three/webgpu'

import {glasswellBalcony as balcony} from './glasswellBalcony.ts'

export class GlasswellBalconyGeometry extends ExtrudeGeometry {
  constructor() {
    const shape = new Shape
    shape.absellipse(0, 0, balcony.width / 2, balcony.depth, Math.PI, 2 * Math.PI, false, 0)
    shape.closePath()
    super(shape, {
      depth: balcony.thickness,
      bevelEnabled: false,
      curveSegments: 64,
    })
    this.rotateX(Math.PI / 2).translate(balcony.x, balcony.topY, balcony.z)
    const positions = this.getAttribute('position')
    const normals = this.getAttribute('normal')
    const uv = this.getAttribute('uv')
    for (let i = 0; i < positions.count; i++) {
      const x = Math.abs(normals.getX(i))
      const y = Math.abs(normals.getY(i))
      const z = Math.abs(normals.getZ(i))
      uv.setXY(i, (x > y && x > z ? positions.getZ(i) : positions.getX(i)) / 8, (y >= x && y >= z ? positions.getZ(i) : positions.getY(i)) / 8)
    }
    this.computeBoundingBox()
    this.computeBoundingSphere()
  }
}
