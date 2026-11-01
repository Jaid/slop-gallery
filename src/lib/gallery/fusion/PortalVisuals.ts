import type {Vec3} from '../types.ts'
import type {PortalPalette} from './PortalCore.ts'

import {Color, Group} from 'three/webgpu'

import GatheringMotes from './GatheringMotes.ts'
import PortalCore from './PortalCore.ts'
import PortalSparks from './PortalSparks.ts'
import RealityWarp from './RealityWarp.ts'
import SoulSiphon from './SoulSiphon.ts'

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
 * Everything a fusion’s portal draws: its glowing disc and its sparks, and the parts only the intro shows: the warp, the motes and a siphon for each of the two things orbiting it. All but the siphons stand at the portal’s middle; the siphons lay themselves out in the world.
 * At radius 0 and without energy, nothing shows, but every part still draws, which lets their pipelines compile behind the loading screen.
 */
export default class PortalVisuals {
  readonly core = new PortalCore
  readonly motes = new GatheringMotes
  readonly root = new Group
  readonly siphons = [new SoulSiphon(0), new SoulSiphon(13.7)]
  readonly sparks = new PortalSparks
  readonly warp = new RealityWarp
  private readonly middle = new Group

  constructor() {
    this.root.name = 'fusion'
    this.middle.add(this.warp, this.core, this.sparks, this.motes)
    this.root.add(this.middle, ...this.siphons)
  }

  dispose() {
    this.core.dispose()
    this.sparks.dispose()
    this.warp.dispose()
    this.motes.dispose()
    for (const siphon of this.siphons) {
      siphon.dispose()
    }
  }

  /** Colors every part. */
  paint({core, rim, swirl}: PortalPalette) {
    this.core.uniforms.core.value.copy(core)
    for (const {uniforms} of [this.core, this.sparks, this.motes, ...this.siphons]) {
      uniforms.rim.value.copy(rim)
      uniforms.swirl.value.copy(swirl)
    }
  }

  /** Moves the disc and the sparks to the portal’s middle. */
  place(center: Vec3) {
    this.middle.position.fromArray(center)
  }
}
