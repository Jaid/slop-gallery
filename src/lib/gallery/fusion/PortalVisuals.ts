import type {Vec3} from '../types.ts'
import type {PortalPalette} from './PortalCore.ts'

import {Color, Group} from 'three/webgpu'

import EnergyTether from './EnergyTether.ts'
import PortalCore from './PortalCore.ts'
import PortalSparks from './PortalSparks.ts'

/** the portal’s own colors: a deep indigo heart, an electric blue swirl and a golden rim */
export const portalPalette = {
  core: '#14062e',
  swirl: '#3fc4ff',
  rim: '#ffd98a',
}
/** what a fizzling portal dies down to */
export const emberPalette = {
  core: '#140300',
  swirl: '#ff5418',
  rim: '#ffab66',
}

/** The palette of a portal tinted in `color`, like an orb’s glow: a darker heart, a brighter swirl and a rim close to white; the portal’s own without one. */
export function paletteOf(color?: string): PortalPalette {
  if (!color) {
    return {
      core: new Color(portalPalette.core),
      swirl: new Color(portalPalette.swirl),
      rim: new Color(portalPalette.rim),
    }
  }
  const tint = new Color(color)
  return {
    core: tint.clone().multiplyScalar(0.1),
    swirl: tint.clone().offsetHSL(0, 0.1, 0.12),
    rim: tint.clone().lerp(new Color('#ffffff'), 0.62),
  }
}

/**
 * Everything a fusion’s portal draws: its glowing disc, its sparks and a tether to each of the two things orbiting it. The disc and the sparks stand at the portal’s middle, the tethers lay themselves out in the world.
 * At radius 0 and without energy, nothing shows, but every part still draws, which lets their pipelines compile behind the loading screen.
 */
export default class PortalVisuals {
  readonly core = new PortalCore
  readonly root = new Group
  readonly sparks = new PortalSparks
  readonly tethers = [new EnergyTether(0), new EnergyTether(13.7)]
  private readonly middle = new Group

  constructor() {
    this.root.name = 'fusion'
    this.middle.add(this.core, this.sparks)
    this.root.add(this.middle, ...this.tethers)
  }

  dispose() {
    this.core.dispose()
    this.sparks.dispose()
    for (const tether of this.tethers) {
      tether.dispose()
    }
  }

  /** Colors every part. */
  paint({core, rim, swirl}: PortalPalette) {
    this.core.uniforms.core.value.copy(core)
    for (const {uniforms} of [this.core, this.sparks, ...this.tethers]) {
      uniforms.rim.value.copy(rim)
      uniforms.swirl.value.copy(swirl)
    }
  }

  /** Moves the disc and the sparks to the portal’s middle. */
  place(center: Vec3) {
    this.middle.position.fromArray(center)
  }
}
