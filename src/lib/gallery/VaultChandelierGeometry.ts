import type {BufferGeometry} from 'three/webgpu'

import {CylinderGeometry, LatheGeometry, SphereGeometry, TorusGeometry, Vector2} from 'three/webgpu'

import {mergeParts} from '../geometry.ts'
import {circleSegments} from '../geometry.ts'
import {lobbyChandelierHeight, lobbyChandeliers} from './lobbyCeiling.ts'

const arms = 8
const hubY = 0
/** Drop from the hub to the candle ring of each tier. */
const tierDrop = [0.15, 1.05]
const tierRadius = [1.7, 1.05]

/**
 * One of the Lobby’s chandeliers, built around the origin at the height of its hub.
 *
 * Two rings of candles hang from scrolled brass arms under a turned stem and a crown. Every part is round, so the satin brass
 * rolls its highlight instead of flashing whole faces. The meshes are relative to the hub; the component lifts them to the vault.
 */
export default class VaultChandelierGeometry {
  readonly brass: BufferGeometry
  readonly candles: BufferGeometry
  readonly flames: BufferGeometry

  constructor() {
    const brass: Array<BufferGeometry> = []
    const candles: Array<BufferGeometry> = []
    const flames: Array<BufferGeometry> = []
    const stem = new LatheGeometry([
      new Vector2(0.02, 0),
      new Vector2(0.055, 0.12),
      new Vector2(0.035, 0.5),
      new Vector2(0.07, 0.72),
      new Vector2(0.11, 0.9),
      new Vector2(0.16, 1.02),
      new Vector2(0.05, 1.16),
      new Vector2(0.02, lobbyChandeliers.drop + 0.65),
    ], 16)
    brass.push(stem.translate(0, hubY, 0))
    const crown = new TorusGeometry(0.2, 0.035, 8, 24)
    brass.push(crown.rotateX(Math.PI / 2).translate(0, lobbyChandeliers.drop + 0.61, 0))
    const hub = new SphereGeometry(0.16, 16, 12)
    brass.push(hub.scale(1, 0.7, 1).translate(0, hubY, 0))
    const finial = new SphereGeometry(0.07, 12, 10)
    brass.push(finial.scale(1, 1.6, 1).translate(0, hubY - 0.22, 0))
    for (const [tier, drop] of tierDrop.entries()) {
      const radius = tierRadius[tier]
      const ring = new TorusGeometry(radius, tier === 0 ? 0.028 : 0.02, 8, circleSegments(radius, 0.004))
      brass.push(ring.rotateX(Math.PI / 2).translate(0, hubY - drop, 0))
      for (let arm = 0; arm < arms; arm++) {
        const angle = arm * Math.PI * 2 / arms + (tier === 1 ? Math.PI / arms : 0)
        const spoke = new CylinderGeometry(0.028, 0.028, radius - 0.15, 8)
        spoke.rotateZ(Math.PI / 2).rotateY(angle)
        spoke.translate(Math.cos(angle) * radius / 2, hubY - drop, Math.sin(angle) * radius / 2)
        brass.push(spoke)
        const scroll = new TorusGeometry(0.16, 0.02, 6, 10, Math.PI)
        brass.push(scroll.rotateZ(Math.PI / 2).rotateY(angle).translate(Math.cos(angle) * (radius - 0.16), hubY - drop + 0.16, Math.sin(angle) * (radius - 0.16)))
        const cup = new LatheGeometry([
          new Vector2(0.035, 0),
          new Vector2(0.055, 0.02),
          new Vector2(0.09, 0.045),
          new Vector2(0.07, 0.06),
        ], 10)
        brass.push(cup.rotateY(angle).translate(Math.cos(angle) * radius, hubY - drop, Math.sin(angle) * radius))
        const candle = new CylinderGeometry(0.028, 0.034, 0.22, 8)
        candles.push(candle.translate(Math.cos(angle) * radius, hubY - drop + 0.16, Math.sin(angle) * radius))
        const flame = new SphereGeometry(0.045, 8, 6)
        flames.push(flame.scale(0.7, 1.6, 0.7).translate(Math.cos(angle) * radius, hubY - drop + 0.33, Math.sin(angle) * radius))
      }
    }
    this.brass = mergeParts(brass)
    this.candles = mergeParts(candles)
    this.flames = mergeParts(flames)
  }

  dispose() {
    this.brass.dispose()
    this.candles.dispose()
    this.flames.dispose()
  }
}

/** World height of a chandelier’s hub, where this geometry’s origin sits. */
export const vaultChandelierHubY = lobbyChandelierHeight
