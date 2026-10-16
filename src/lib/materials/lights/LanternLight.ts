import type {ColorRepresentation} from 'three/webgpu'

import {PointLight} from 'three/webgpu'

export type LanternRoof = {
  /** sine of the elevation above which only {@link leak} gets out */
  end: number
  /** share of the light that still reaches the ceiling right above, bounced off the roof’s underside and the glass */
  leak: number
  /** sine of the elevation where the roof starts to shade, seen from the flame */
  start: number
}

export type LanternBounce = {
  /** beyond this distance from the lamp, in meters, no bounce light is left */
  distance: number
  /** distance in meters at which the bounce light has fallen to half */
  radius: number
  /** bounce irradiance right at the lamp, as a share of its intensity */
  share: number
}

const noBounce: LanternBounce = {
  distance: 0,
  radius: 1,
  share: 0,
}
const openRoof: LanternRoof = {
  start: 0,
  end: 1,
  leak: 1,
}

/**
 * A point light inside a lantern with an opaque roof: below and around the lantern it shines as usual, but toward the ceiling directly above, the roof lets only a little through.
 *
 * Without a global illumination pass, nothing would light the faces turned away from every lamp. Its {@link LanternBounce} stands in for the light thrown back by the boards around it: a soft, directionless glow that is strongest close to the lamp and gone long before the dark between two lamps.
 *
 * It needs {@link LanternLightNode} registered in the renderer’s node library.
 */
export default class LanternLight extends PointLight {
  bounce: LanternBounce
  readonly isLanternLight = true
  roof: LanternRoof

  // Three.js clones lights through a constructor without arguments; that lantern has no roof.
  constructor({color, intensity = 1, distance = 0, decay = 2, roof = openRoof, bounce = noBounce}: {
    bounce?: LanternBounce
    color?: ColorRepresentation
    decay?: number
    distance?: number
    intensity?: number
    roof?: LanternRoof
  } = {}) {
    super(color, intensity, distance, decay)
    if (!(roof.leak >= 0 && roof.leak <= 1) || !(roof.start < roof.end) || roof.start < -1 || roof.end > 1) {
      throw new RangeError('A lantern roof needs a leak between 0 and 1 and a start elevation below its end.')
    }
    if (!(bounce.share >= 0) || !(bounce.radius > 0) || !(bounce.distance >= 0)) {
      throw new RangeError('A lantern’s bounce light needs a non-negative share and distance and a positive radius.')
    }
    this.roof = {...roof}
    this.bounce = {...bounce}
  }

  /** Bounce irradiance at a distance from the lamp, as a share of its intensity. */
  bounceAt(distance: number) {
    const {share, radius, distance: reach} = this.bounce
    if (!(distance < reach)) {
      return 0
    }
    const window = (1 - (distance / reach) ** 4) ** 2
    return share / (1 + (distance / radius) ** 2) * window
  }

  override copy(source: LanternLight, recursive?: boolean) {
    super.copy(source, recursive)
    this.roof = {...source.roof}
    this.bounce = {...source.bounce}
    return this
  }

  /** Share of the light that leaves the lantern toward a direction with the given vertical component. */
  transmission(directionY: number) {
    const {start, end, leak} = this.roof
    const t = Math.min(1, Math.max(0, (directionY - start) / (end - start)))
    return 1 - (1 - leak) * t * t * (3 - 2 * t)
  }
}
