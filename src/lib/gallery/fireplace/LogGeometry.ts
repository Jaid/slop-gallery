import {CylinderGeometry} from 'three/webgpu'

export type LogShape = {
  length: number
  radiusBottom: number
  radiusTop: number
  /** decorrelates each log’s knobs and bends */
  seed: number
}

/**
 * Firewood along the y axis, like `CylinderGeometry`, but no longer a turned dowel.
 *
 * The cross section is lumpy and slightly oval, knobs swell where branches once grew and the whole log bows a little. Every displacement is a function of the angle around the axis and the height alone, so the side and the cap rims – which are separate vertices in `CylinderGeometry` – stay welded.
 */
export default class LogGeometry extends CylinderGeometry {
  constructor({length, radiusTop, radiusBottom, seed}: LogShape, radialSegments = 28, heightSegments = 10) {
    super(radiusTop, radiusBottom, length, radialSegments, heightSegments)
    const s = seed * 17.3
    const position = this.getAttribute('position')
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i)
      const y = position.getY(i)
      const z = position.getZ(i)
      const along = y / length * 2
      const angle = Math.atan2(z, x)
      // Smooth periodic lumps around the axis plus a few knobs along it.
      const lumps = Math.sin(angle * 3 + s + along * 0.8) * 0.06 + Math.sin(angle * 5 + s * 1.7 + along * 2.1) * 0.035 + Math.sin(angle * 2 + s * 0.6) * 0.07 + Math.sin(along * 5.3 + s * 3.1) * 0.04
      const knob = Math.max(0, Math.sin(angle + s * 2.3) * Math.sin(along * 4.3 + s) - 0.5) * 0.6
      const scale = 1 + lumps + knob
      // Bow sideways and up a little, most in the middle.
      const bow = (1 - along ** 2) * radiusBottom * 0.4
      position.setXYZ(i, x * scale + Math.sin(s) * bow, y, z * scale * 0.9 + Math.cos(s) * bow)
    }
    position.needsUpdate = true
    // Caps keep their own vertices, so smoothing never rounds the cut ends into the bark.
    this.computeVertexNormals()
    this.computeBoundingBox()
    this.computeBoundingSphere()
  }
}
