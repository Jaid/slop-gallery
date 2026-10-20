import type {BufferGeometry} from 'three/webgpu'

import {CylinderGeometry, OctahedronGeometry, SphereGeometry, TorusGeometry, Vector3} from 'three/webgpu'

import {mergeParts} from '../geometry.ts'
import {lobbyChandeliers, lobbyVaultHeight} from './lobbyCeiling.ts'
import PolylineTubeGeometry from './railings/PolylineTubeGeometry.ts'

const wheel = (r: number, tube: number, y: number) => {
  const geometry = new TorusGeometry(r, tube, 10, 112)
  return geometry.rotateX(Math.PI / 2).translate(0, y, 0)
}
const drop = (x: number, y: number, z: number, size: number) => {
  const geometry = new OctahedronGeometry(size)
  return geometry.scale(0.52, 1.8, 0.52).translate(x, y, z)
}
const cylinder = (top: number, bottom: number, height: number, segments: number, x: number, y: number, z: number) => {
  const geometry = new CylinderGeometry(top, bottom, height, segments)
  return geometry.translate(x, y, z)
}

/** Monumental two-tier brass corona with swept arms, candle cups, crystal festoons and a roof-mounted suspension. Shared by all three fixtures. */
export default class LobbyChandelierGeometry {
  readonly candles: BufferGeometry
  readonly crystals: BufferGeometry
  readonly flames: BufferGeometry
  readonly metal: BufferGeometry
  readonly suspension: BufferGeometry

  constructor() {
    const metal: Array<BufferGeometry> = []
    const candles: Array<BufferGeometry> = []
    const flames: Array<BufferGeometry> = []
    const crystals: Array<BufferGeometry> = []
    const suspension: Array<BufferGeometry> = []
    const hub = new SphereGeometry(0.3, 24, 16)
    metal.push(cylinder(0.065, 0.09, 2.9, 20, 0, 0.65, 0), hub.scale(1, 1.3, 1))
    metal.push(wheel(0.4, 0.045, -0.37), wheel(0.25, 0.035, 0.35))
    crystals.push(drop(0, -0.95, 0, 0.2))
    for (const tier of [{
      radius: lobbyChandeliers.radius,
      y: -0.1,
      count: 16,
    }, {
      radius: 1.1,
      y: 1.25,
      count: 10,
    }]) {
      const {radius, y, count} = tier
      metal.push(wheel(radius - 0.25, 0.055, y - 0.22), wheel(radius - 0.25, 0.025, y - 0.38))
      for (let i = 0; i < count; i++) {
        const angle = i / count * Math.PI * 2
        const radial = (r: number, height: number, turn = angle) => new Vector3(Math.cos(turn) * r, height, Math.sin(turn) * r)
        const arm = Array.from({length: 25}, (_, j) => {
          const t = j / 24
          return radial(0.15 + (radius - 0.15) * t, y + 0.35 - Math.sin(t * Math.PI) * 0.7)
        })
        metal.push(new PolylineTubeGeometry(arm, 0.035, 10))
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius
        metal.push(cylinder(0.15, 0.065, 0.065, 20, x, y + 0.36, z))
        candles.push(cylinder(0.052, 0.058, 0.37, 12, x, y + 0.56, z))
        const flame = new SphereGeometry(0.075, 12, 10)
        flames.push(flame.scale(0.7, 1.9, 0.7).translate(x, y + 0.81, z))
        // Draped crystal swags between candle arms, with a pendant at each scallop.
        for (let bead = 0; bead < 9; bead++) {
          const t = bead / 8
          const p = radial(radius - 0.24, y - 0.36 - Math.sin(t * Math.PI) * 0.28, angle + t / count * Math.PI * 2)
          const crystal = new SphereGeometry(0.046, 8, 6)
          crystals.push(crystal.translate(p.x, p.y, p.z))
        }
        const p = radial(radius - 0.24, y - 0.72)
        crystals.push(drop(p.x, p.y, p.z, 0.11))
      }
    }
    // Three tension rods form a crown above the hub; a slim central stem reaches the real vault soffit.
    const anchorY = lobbyVaultHeight(0) - lobbyChandeliers.y - 0.32
    for (let i = 0; i < 3; i++) {
      const angle = i * Math.PI * 2 / 3
      suspension.push(new PolylineTubeGeometry([new Vector3(Math.cos(angle) * 1.05, 1, Math.sin(angle) * 1.05), new Vector3(0, 2.3, 0)], 0.022, 8))
    }
    suspension.push(cylinder(0.027, 0.027, anchorY - 2.1, 12, 0, (anchorY + 2.1) / 2, 0))
    suspension.push(cylinder(0.22, 0.12, 0.14, 24, 0, anchorY, 0))
    this.metal = mergeParts(metal)
    this.candles = mergeParts(candles)
    this.flames = mergeParts(flames)
    this.crystals = mergeParts(crystals)
    this.suspension = mergeParts(suspension)
  }

  dispose() {
    for (const geometry of [this.metal, this.candles, this.flames, this.crystals, this.suspension]) {
      geometry.dispose()
    }
  }
}
