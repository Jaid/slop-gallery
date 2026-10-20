import type {BufferGeometry} from 'three/webgpu'

import {BoxGeometry, BufferGeometry as ThreeBufferGeometry, Float32BufferAttribute, Uint32BufferAttribute} from 'three/webgpu'

import {mergeParts} from '../geometry.ts'
import lobby from './lobby.ts'
import lobbyCeiling, {lobbyVaultBands, lobbyVaultBays, lobbyVaultRadius, lobbyVaultRibs, vaultBarOffsets, vaultPoint} from './lobbyCeiling.ts'

const halfDepth = (lobby.southZ - lobby.northZ) / 2
/** Segments each plaster band is split into around the vault. */
const bandSteps = 2

/**
 * Merged meshes of the Lobby’s barrel vault, relative to the room center at floor level: the plaster shell and its ribs, the
 * bronze glazing bars and the glass of the three bays. The glass faces the room, so the sky behind it shows through.
 */
export default class LobbyCeilingGeometry {
  readonly bars: BufferGeometry
  readonly glass: BufferGeometry
  readonly plaster: BufferGeometry

  constructor() {
    const {bands, bar, glassInset, molding, rib, shell} = lobbyCeiling
    const bandAngle = Math.PI / bands
    const plaster: Array<BufferGeometry> = []
    const bars: Array<BufferGeometry> = []
    const glass: Array<BufferGeometry> = []
    const ribs = lobbyVaultRibs()
    const glazed = lobbyVaultBands().filter(entry => entry.glazed)
    const glazedFrom = glazed[0].angle - bandAngle / 2
    const glazedTo = glazed.at(-1)!.angle + bandAngle / 2
    for (const band of lobbyVaultBands()) {
      const from = band.angle - bandAngle / 2
      const to = band.angle + bandAngle / 2
      if (band.glazed) {
        continue
      }
      // The bands over the springing run the whole room; only the crown stays open between the ribs.
      const edge = Math.abs(band.angle) > Math.PI / 3
      if (edge) {
        plaster.push(curvedShell(from, to, -halfDepth, halfDepth, 0, shell, bandSteps))
      } else {
        plaster.push(curvedShell(from, to, -halfDepth, ribs[0].z + rib.width / 2, 0, shell, bandSteps))
        plaster.push(curvedShell(from, to, ribs.at(-1)!.z - rib.width / 2, halfDepth, 0, shell, bandSteps))
      }
    }
    for (let index = 0; index < ribs.length - 1; index++) {
      glass.push(curvedPane(glazedFrom, glazedTo, ribs[index].z, ribs[index + 1].z, glassInset, glazed.length * bandSteps))
    }
    for (const {z} of ribs) {
      plaster.push(curvedBox(-Math.PI / 2, glazedFrom, z, rib.width, rib.depth, 0.02, 8))
      plaster.push(curvedBox(glazedTo, Math.PI / 2, z, rib.width, rib.depth, 0.02, 8))
    }
    for (const side of [-1, 1]) {
      const [x, y] = vaultPoint(side * Math.PI / 2, 0)
      const moldingBox = new BoxGeometry(molding.depth, molding.height, halfDepth * 2)
      plaster.push(moldingBox.translate(x + side * molding.depth / 2, y + molding.height / 2, 0))
    }
    const west = glazedFrom
    const east = glazedTo
    for (const bay of lobbyVaultBays()) {
      const [across, along] = bay.field.center
      const [width, depth] = bay.field.size
      const steps = glazed.length * bandSteps
      const beam = bar.width / 2 / lobbyVaultRadius
      for (const offset of vaultBarOffsets(width, lobbyCeiling.panes[0])) {
        const angle = Math.asin(Math.min(1, Math.max(-1, (across + offset) / lobbyVaultRadius)))
        bars.push(curvedBox(angle - beam, angle + beam, along, bar.width, bar.depth, 0, 2))
      }
      for (const offset of vaultBarOffsets(depth, lobbyCeiling.panes[1])) {
        bars.push(curvedBox(west + beam * 2, east - beam * 2, along + offset, bar.width, bar.depth, 0, steps))
      }
    }
    this.plaster = mergeParts(plaster)
    this.bars = mergeParts(bars)
    this.glass = mergeParts(glass)
  }

  dispose() {
    this.plaster.dispose()
    this.bars.dispose()
    this.glass.dispose()
  }
}

type Ring = Array<[number, number, number]>

/** Four corners of a vault section at one angle: outer south, outer north, inner north, inner south. */
function section(angle: number, z: number, width: number, depth: number, inset: number): Ring {
  const outer = vaultPoint(angle, 0, inset)
  const inner = vaultPoint(angle, 0, inset + depth)
  return [
    [outer[0], outer[1], z - width / 2],
    [outer[0], outer[1], z + width / 2],
    [inner[0], inner[1], z + width / 2],
    [inner[0], inner[1], z - width / 2],
  ]
}

/**
 * A solid curved box following the vault from `from` to `to`, centered at `z`.
 * `depth` hangs toward the room from `inset` inside the intrados; the inner face points into the room.
 */
function curvedBox(from: number, to: number, z: number, width: number, depth: number, inset: number, steps: number) {
  const rings = Array.from({length: steps + 1}, (_, step) => section(from + (to - from) * step / steps, z, width, depth, inset))
  const positions: Array<number> = []
  const normals: Array<number> = []
  const uvs: Array<number> = []
  const indices: Array<number> = []
  const add = (point: [number, number, number], normal: [number, number, number]) => {
    positions.push(...point)
    normals.push(...normal)
    uvs.push(0, 0)
    return positions.length / 3 - 1
  }
  const quad = (a: number, b: number, c: number, d: number) => indices.push(a, b, c, a, c, d)
  const radial = (angle: number, inward: boolean): [number, number, number] => inward ? [-Math.sin(angle), -Math.cos(angle), 0] : [Math.sin(angle), Math.cos(angle), 0]
  for (let step = 0; step < steps; step++) {
    const angle = from + (to - from) * (step + 0.5) / steps
    const [a0, b0, c0, d0] = rings[step]
    const [a1, b1, c1, d1] = rings[step + 1]
    const outer = radial(angle, false)
    const inner = radial(angle, true)
    quad(add(a0, outer), add(b0, outer), add(b1, outer), add(a1, outer))
    quad(add(c0, inner), add(c1, inner), add(d1, inner), add(d0, inner))
    quad(add(b0, [0, 0, 1]), add(c0, [0, 0, 1]), add(c1, [0, 0, 1]), add(b1, [0, 0, 1]))
    quad(add(d0, [0, 0, -1]), add(d1, [0, 0, -1]), add(a1, [0, 0, -1]), add(a0, [0, 0, -1]))
  }
  const cap = (ring: Ring, angle: number, forward: boolean) => {
    const normal = radial(angle, !forward)
    const [a, b, c, d] = ring.map(point => add(point, normal))
    if (forward) {
      quad(a, d, c, b)
    } else {
      quad(a, b, c, d)
    }
  }
  cap(rings[0], from, false)
  cap(rings.at(-1)!, to, true)
  return indexed(positions, normals, uvs, indices)
}

/** The plaster shell of one band: outer and inner faces plus the two end caps. Its long edges meet the next band. */
function curvedShell(from: number, to: number, z1: number, z2: number, inset: number, thickness: number, steps: number) {
  return curvedBox(from, to, (z1 + z2) / 2, z2 - z1, thickness, inset, steps)
}

/** Glass following the vault between two angles, facing the room. Several steps keep it from cutting across the curve as one flat sheet. */
function curvedPane(from: number, to: number, z1: number, z2: number, inset: number, steps = 8) {
  const positions: Array<number> = []
  const normals: Array<number> = []
  const uvs: Array<number> = []
  const indices: Array<number> = []
  const add = (angle: number, z: number, u: number, v: number) => {
    const [x, y] = vaultPoint(angle, z, inset)
    positions.push(x, y, z)
    normals.push(-Math.sin(angle), -Math.cos(angle), 0)
    uvs.push(u, v)
    return positions.length / 3 - 1
  }
  for (let step = 0; step < steps; step++) {
    const a0 = from + (to - from) * step / steps
    const a1 = from + (to - from) * (step + 1) / steps
    const u0 = step / steps
    const u1 = (step + 1) / steps
    const a = add(a0, z1, u0, 0)
    const b = add(a1, z1, u1, 0)
    const c = add(a1, z2, u1, 1)
    const d = add(a0, z2, u0, 1)
    indices.push(a, b, c, a, c, d)
  }
  return indexed(positions, normals, uvs, indices)
}

function indexed(positions: Array<number>, normals: Array<number>, uvs: Array<number>, indices: Array<number>) {
  const geometry = new ThreeBufferGeometry
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(new Uint32BufferAttribute(indices, 1))
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}
