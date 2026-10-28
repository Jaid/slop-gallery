import oculusBalcony from '../oculusBalcony.ts'
import {towerRamp} from '../oculusTower.ts'
import RailingPath from './RailingPath.ts'

/** Guards the balcony’s open edge at the tower fence’s half height, stopping short of both side walls. */
export default class OculusBalconyRailing extends RailingPath {
  constructor() {
    const {position, size} = oculusBalcony
    const inset = 0.12
    const y = position[1] + size[1] / 2
    const z = position[2] - size[2] / 2 + inset
    const halfWidth = size[0] / 2 - 0.3
    super([-1, 1].map(side => ({
      ground: [position[0] + side * halfWidth, y, z],
      height: towerRamp.railHeight / 2,
    })))
    // Both ends overhang instead of standing on posts; the posts spread out evenly, half a spacing in from each end.
    const count = Math.round(this.horizontalLength / RailingPath.postSpacing)
    this.posts.splice(0, this.posts.length, ...Array.from({length: count}, (_, i) => this.post((i + 0.5) / count)))
  }
}
