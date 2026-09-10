import {Curve, Vector3} from 'three/webgpu'

export class RopeRing extends Curve<Vector3> {
  constructor(readonly radius: number, readonly count: number) {
    super()
  }

  getPoint(t: number, target = new Vector3) {
    const angle = t * Math.PI * 2
    return target.set(Math.cos(angle) * this.radius, 1.02 - Math.abs(Math.sin(t * this.count * Math.PI)) * 0.17, Math.sin(angle) * this.radius)
  }
}
