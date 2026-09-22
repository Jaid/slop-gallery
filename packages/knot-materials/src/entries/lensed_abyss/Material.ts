import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_fractal_noise_float, negateOnBackSide, normalLocal, positionViewDirection, tangentView, time, transformNormalToView, uv, vec2, vec3} from 'three/tsl'

import KnotMaterial from '../../lib/KnotMaterial.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

const TAU = Math.PI * 2
/**
 * The knot is a collapsing mass. Its skin is a mirror so black that almost nothing survives the round trip, and the spacetime around it drags every reflection inward. What you actually see is the accretion flow: plasma torn along the tube, beamed toward you on the approaching side and reddened on the receding one, capped by the razor-thin photon ring at the silhouette.
 */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.3)
    this.name = knotData.id
    const {p, grazing, near, intimate} = viewerFrame()
    const tube = uv()
    const surface = normalLocal.normalize()
// Frame dragging: the mirror normal is pulled toward the singularity, so the reflected
// image of the studio is compressed into a ring instead of a tidy window.
    const inward = p.negate().normalize()
    const drag = inward.sub(surface.mul(inward.dot(surface)))
    const swirl = drag.cross(surface).mul(grazing.mul(0.8).add(0.2))
    const lensed = surface.add(drag.mul(0.5)).add(swirl.mul(0.7)).normalize()
    this.normalNode = negateOnBackSide(transformNormalToView(lensed))
    this.clearcoatNormalNode = this.normalNode
    this.colorNode = color('#010102')
    this.metalness = 1
    this.roughnessNode = float(0.02)
// ------------------------------------------------------------------
// Accretion flow. The angular coordinate wraps on a circle so the
// streaks never break at the seam; two rounds of domain warping shear
// them into the ragged filaments of a turbulent magnetised plasma.
// ------------------------------------------------------------------
    const advection = tube.x.mul(TAU).add(time.mul(0.17))
    const wrap = vec2(advection.cos(), advection.sin()).mul(0.34)
    const along = tube.x.mul(TAU).mul(5).add(time.mul(0.5)).sin().mul(0.3).add(tube.x.mul(TAU).mul(13).sub(time.mul(0.9)).sin().mul(0.16))
    const stream = vec3(wrap.x, wrap.y, tube.y.mul(11).add(along))
    const curl = mx_fractal_noise_float(stream.mul(3.4), 4, 2.15, 0.55)
    const curl2 = mx_fractal_noise_float(stream.mul(7.5).add(vec3(curl.mul(1.6))), 3, 2.3, 0.5)
    const warped = stream.add(vec3(curl.mul(0.85), curl2.mul(0.6), curl2.mul(0.55)))
    const fine = mx_fractal_noise_float(warped.mul(vec3(2.4, 2.4, 1.1)).add(vec3(0, 0, time.mul(0.04))), 4, 2.25, 0.55)
    const plasma = fine.mul(0.5).add(0.5)
// Relativistic beaming: the flow runs along the tube, so the side coming at you blazes.
    const beta = tangentView.dot(positionViewDirection)
    const doppler = beta.mul(0.5).add(0.5)
    const approach = doppler.pow(2.4).mul(2.6).add(0.06)
    const recede = doppler.oneMinus().pow(2.4).mul(0.6)
// Blackbody ramp: void, ember, incandescent, then an ionised blue-white shock front.
    const ember = mix(color('#2a0400'), color('#ff3800'), plasma.smoothstep(0.42, 0.74))
    const flame = mix(ember, color('#ffb347'), plasma.smoothstep(0.66, 0.86))
    const shock = mix(flame, color('#bcd8ff'), plasma.smoothstep(0.86, 0.98))
    const hot = plasma.smoothstep(0.56, 0.9)
// The plasma clings to the limb, leaving the shadow of the horizon itself bare.
    const limb = grazing.pow(0.5).mul(0.95).add(0.05)
// The photon ring is a caustic, not a rim: an almost sub-pixel spike of unclipped white.
    const ring = grazing.smoothstep(0.985, 0.9995).mul(14)
    this.emissiveNode = shock.mul(hot).mul(approach).mul(limb).mul(near.mul(0.5).add(0.55)).mul(3.4)
      .add(color('#ff2200').mul(plasma.smoothstep(0.5, 0.92)).mul(recede).mul(limb).mul(1.2))
      .add(color('#fff8ee').mul(ring))
      .add(color('#ff7a2e').mul(grazing.pow(8)).mul(0.5))
      .add(color('#ffb066').mul(hot).mul(grazing.mul(0.7)).mul(intimate.mul(0.6).add(0.4)).mul(0.5))
  }
}
