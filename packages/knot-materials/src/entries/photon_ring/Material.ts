import type {Node, Texture} from 'three/webgpu'

import {color, float, mix, mx_atan2, mx_fractal_noise_float, mx_noise_float, time} from 'three/tsl'

import KnotMaterial from '../../lib/KnotMaterial.ts'
import {starfield} from '../../lib/starfield.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'
import {accretionDisk} from './util.ts'

export default class PhotonRingMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 1.1)
    this.name = knotData.id
// ---------------------------------------------------------------
// A knot of curved spacetime. The surface is a black mirror, but the
// sky it shows is bent: rays that pass close to the center are dragged
// sideways, so the background wraps into a ring and the accretion disk
// is smeared into an arc that no straight line of sight could produce.
// The disk is intersected analytically, spins at Keplerian speed, and
// blazes on the side sweeping toward you.
// ---------------------------------------------------------------
    const {p, view, facing, rim, near, intimate} = viewerFrame()
    const toEye = view
    const escape = view.negate()
// Impact parameter of the escaping ray: how close it passes to the
// singularity. Zero means it goes straight through the shadow.
    const offset = p.sub(escape.mul(p.dot(escape)))
    const b = offset.length()
    const radial = offset.div(b.max(0.0001))
    const pull = float(0.15).div(b.max(0.07))
    const sky = escape.add(radial.mul(pull)).normalize()
    const disk = accretionDisk(p, sky, toEye, intimate)
// The lensed background: sparse stars, and a faint violet haze that
// thickens toward the shadow where the sky is compressed.
    const stars = starfield(sky, 190, 0.86)
    // Fractal octaves can exceed [-1, 1]; bound the remap before fractional powers.
    const haze = mx_fractal_noise_float(sky.mul(4.2), 4, 2.1, 0.55).mul(0.5).add(0.5).clamp()
    const hazeColor = mix(color('#33195e'), color('#8f6bff'), haze.pow(1.5))
    const compression = float(0.35).div(b.max(0.08)).min(2.6)
// The photon ring: light that orbited the singularity before leaving.
    const ring = facing.div(0.13).clamp(0, 1).oneMinus().pow(1.3)
    const ringGrain = mx_noise_float(sky.mul(9)).mul(0.5).add(0.5)
    const photon = color('#eaf2ff').mul(ring).mul(ringGrain.mul(0.5).add(0.6)).mul(2.6)
// The mirror body itself: a black glass that only shows the studio.
    const body = mix(color('#050309'), color('#1d1440'), mx_noise_float(p.mul(6)).mul(0.5).add(0.5))
// Frame dragging: the mirror itself is slowly wound around the axis.
    const azimuth = mx_atan2(p.z, p.x.add(0.000001)) as unknown as Node<'float'>
    const drag = azimuth.add(p.y.mul(7)).add(time.mul(0.12)).sin().mul(0.5).add(0.5)
    this.colorNode = mix(mix(body, color('#3a2478'), drag.mul(0.35)), color('#2b1c5e'), disk.density.mul(0.35).add(ring.mul(0.25)))
    this.metalness = 1
    this.roughnessNode = float(0.035).add(haze.mul(0.03)).add(disk.density.mul(0.04))
    this.clearcoat = 0.4
    this.clearcoatRoughness = 0.02
    const glow: Node<'vec3'> = disk.emission
      .add(disk.halo.mul(0.7))
      .add(stars.mul(color('#9fc8ff')).mul(compression.mul(0.5).add(0.5)).mul(2.4))
      .add(hazeColor.mul(haze.mul(0.5)).mul(compression.mul(0.45).add(0.3)))
      .add(photon)
      .add(color('#7a5cff').mul(rim).mul(0.07))
      .add(color('#dbe8ff').mul(ring).mul(near).mul(0.35))
    this.emissiveNode = glow
  }
}
