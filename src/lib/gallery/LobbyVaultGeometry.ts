import type {BufferGeometry} from 'three/webgpu'

import {BoxGeometry, ExtrudeGeometry, Path, Shape, SphereGeometry, TorusGeometry} from 'three/webgpu'

import {mergeParts} from '../geometry.ts'
import {colliderGeometry} from './architecture.ts'
import ArcSlabGeometry from './ArcSlabGeometry.ts'
import lobbyVault, {cofferFrameAngles, glazingStart, vaultBays, vaultRibs} from './lobbyVault.ts'

/** Height of both rose windows’ centers above the floor. */
export const roseCenterY = lobbyVault.springY + lobbyVault.rose.rise

const box = (width: number, height: number, depth: number, x: number, y: number, z: number) => {
  const geometry = new BoxGeometry(width, height, depth)
  return geometry.translate(x, y, z)
}
/** A slab bent around the vault’s axis, which runs along z at the springing height. */
const arc = (radii: readonly [number, number], angles: readonly [number, number], z: readonly [number, number], segments?: number) => {
  const geometry = new ArcSlabGeometry({
    radii,
    angles,
    z,
    segments,
  })
  return geometry.translate(0, lobbyVault.springY, 0)
}
/** Both flanks of the vault: the east one as given, the west one mirrored across the crown. */
const flanks = (radii: readonly [number, number], angles: readonly [number, number], z: readonly [number, number], segments?: number) => [
  arc(radii, angles, z, segments),
  arc(radii, [Math.PI - angles[1], Math.PI - angles[0]], z, segments),
]
/** A gilt rosette facing +y: a domed boss inside a beaded ring with eight petals. */
const rosette = (size: number) => {
  const boss = new SphereGeometry(size * 0.38, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2)
  const ring = new TorusGeometry(size * 0.62, size * 0.09, 4, 16)
  const parts: Array<BufferGeometry> = [boss.scale(1, 0.7, 1), ring.rotateX(Math.PI / 2)]
  for (let i = 0; i < 8; i++) {
    const petal = new SphereGeometry(size * 0.2, 6, 2, 0, Math.PI * 2, 0, Math.PI / 2)
    const angle = i * Math.PI / 4 + Math.PI / 8
    parts.push(petal.scale(1.5, 0.45, 0.8).translate(size * 0.62, 0, 0).rotateY(angle))
  }
  return mergeParts(parts)
}

/**
 * A smooth half-cylinder along the vault’s inner face, so thrown things bounce off the coffer frames and the glass instead of
 * disappearing into the vault. Returned as vertices and indices for a triangle mesh collider.
 */
export function lobbyVaultCollision() {
  const {halfLength, radius, springY} = lobbyVault
  const shell = new ArcSlabGeometry({
    radii: [radius, radius + 0.1],
    angles: [0, Math.PI],
    z: [-halfLength, halfLength],
    segments: 32,
  })
  try {
    return colliderGeometry(shell.translate(0, springY, 0))
  } finally {
    shell.dispose()
  }
}

/**
 * Merged meshes of the Lobby’s barrel vault, relative to the room center at floor level, by material: the clad attic walls and
 * lunettes, carved trim, the vault’s limestone ribs and coffer frames, the plaster behind the coffers, gilding, bronze glazing
 * bars and the glass of the crown band and both rose windows.
 */
export default class LobbyVaultGeometry {
  readonly bars: BufferGeometry
  readonly clad: BufferGeometry
  readonly glass: BufferGeometry
  readonly gold: BufferGeometry
  readonly plaster: BufferGeometry
  /** stained glass of both rose windows, centered at x = 0 and {@link roseCenterY} in local space */
  readonly roseGlass: BufferGeometry
  readonly stone: BufferGeometry
  readonly trim: BufferGeometry

  constructor() {
    const {atticBottom, atticPanel, coffer, corniceTop, glazing, halfLength, impost, outerRadius, pilaster, radius, rib, rose, springY} = lobbyVault
    const clad: Array<BufferGeometry> = []
    const trim: Array<BufferGeometry> = []
    const stone: Array<BufferGeometry> = []
    const plaster: Array<BufferGeometry> = []
    const gold: Array<BufferGeometry> = []
    const bars: Array<BufferGeometry> = []
    const glass: Array<BufferGeometry> = []
    const roseGlass: Array<BufferGeometry> = []
    const back = radius + coffer.depth
    const fullLength = [-halfLength, halfLength] as const
    // The attic storey carries on the walls’ cladding up to the springing line.
    const atticHeight = springY - atticBottom
    for (const side of [-1, 1]) {
      clad.push(box(outerRadius - radius, atticHeight, halfLength * 2, side * (radius + outerRadius) / 2, atticBottom + atticHeight / 2, 0))
    }
    // The impost molding runs around all four sides; the end runs stop against the long ones.
    const upperY = springY - impost.height / 2
    const lowerY = springY - impost.height - impost.lowerHeight / 2
    for (const side of [-1, 1]) {
      trim.push(box(impost.projection, impost.height, halfLength * 2, side * (radius - impost.projection / 2), upperY, 0))
      trim.push(box(impost.lowerProjection, impost.lowerHeight, halfLength * 2, side * (radius - impost.lowerProjection / 2), lowerY, 0))
      trim.push(box((radius - impost.projection) * 2, impost.height, impost.projection, 0, upperY, side * (halfLength - impost.projection / 2)))
      trim.push(box((radius - impost.lowerProjection) * 2, impost.lowerHeight, impost.lowerProjection, 0, lowerY, side * (halfLength - impost.lowerProjection / 2)))
      // A gilt fillet runs along the face of the upper band, along the long walls and across the ends.
      const filletY = springY - impost.height * 0.55
      gold.push(box(impost.fillet, impost.bead, halfLength * 2 - impost.projection * 2, side * (radius - impost.projection - impost.fillet / 2), filletY, 0))
      gold.push(box((radius - impost.projection - impost.fillet) * 2, impost.bead, impost.fillet, 0, filletY, side * (halfLength - impost.projection - impost.fillet / 2)))
    }
    const capitalTop = springY - impost.height - impost.lowerHeight
    const shaftBottom = corniceTop + pilaster.base.height
    const shaftTop = capitalTop - pilaster.capital.height
    for (const {z, wallArch} of vaultRibs()) {
      // The wall arches frame the lunettes; their pilasters stand in the corners against the end walls.
      for (const side of [-1, 1]) {
        const at = (projection: number) => side * (radius - projection / 2)
        const width = (value: number) => (wallArch ? pilaster.width + (value - pilaster.width) / 2 : value)
        const center = (value: number) => (wallArch ? z - Math.sign(z) * (value - pilaster.width) / 4 : z)
        trim.push(box(pilaster.projection, shaftTop - shaftBottom, pilaster.width, at(pilaster.projection), (shaftTop + shaftBottom) / 2, z))
        trim.push(box(pilaster.base.projection, pilaster.base.height, width(pilaster.base.width), at(pilaster.base.projection), corniceTop + pilaster.base.height / 2, center(pilaster.base.width)))
        trim.push(box(pilaster.capital.projection, pilaster.capital.height, width(pilaster.capital.width), at(pilaster.capital.projection), shaftTop + pilaster.capital.height / 2, center(pilaster.capital.width)))
      }
      const z0 = z - rib.width / 2
      const z1 = z + rib.width / 2
      stone.push(arc([radius - rib.depth, back], [0, Math.PI], [z0, z1]))
      for (const edge of [-1, 1]) {
        const beadZ = z + edge * (rib.width / 2 - rib.beadInset)
        gold.push(arc([radius - rib.depth - rib.fillet, radius - rib.depth + 0.01], [0, Math.PI], [beadZ - rib.bead / 2, beadZ + rib.bead / 2]))
      }
    }
    // Sunk panels between the pilasters of the attic, framed by a slim molding.
    for (const [north, south] of vaultBays()) {
      const z0 = north + atticPanel.inset
      const z1 = south - atticPanel.inset
      const length = z1 - z0
      const height = atticPanel.top - atticPanel.bottom
      for (const side of [-1, 1]) {
        const x = side * (radius - atticPanel.projection / 2)
        trim.push(box(atticPanel.projection, atticPanel.molding, length, x, atticPanel.bottom + atticPanel.molding / 2, (z0 + z1) / 2))
        trim.push(box(atticPanel.projection, atticPanel.molding, length, x, atticPanel.top - atticPanel.molding / 2, (z0 + z1) / 2))
        for (const z of [z0 + atticPanel.molding / 2, z1 - atticPanel.molding / 2]) {
          trim.push(box(atticPanel.projection, height - atticPanel.molding * 2, atticPanel.molding, x, (atticPanel.bottom + atticPanel.top) / 2, z))
        }
      }
    }
    // The coffered flanks: plaster behind, limestone frames in front of it, and a gilt rosette in the middle of every field.
    plaster.push(...flanks([back, outerRadius], [0, glazingStart], fullLength))
    const frameAngles = cofferFrameAngles()
    const frameWidth = coffer.frame / radius
    const curbWidth = coffer.curb / radius
    const frameRanges = frameAngles.map((angle, i) => {
      if (i === 0) {
        return [0, frameWidth / 2] as const
      }
      if (i === frameAngles.length - 1) {
        return [angle - curbWidth, angle] as const
      }
      return [angle - frameWidth / 2, angle + frameWidth / 2] as const
    })
    for (const range of frameRanges) {
      stone.push(...flanks([radius, back], range, fullLength))
    }
    const template = rosette(coffer.rosette)
    const step = coffer.frame * 0.4
    const stepWidth = step / radius
    for (const [north, south] of vaultBays()) {
      const columns = Array.from({length: coffer.columns + 1}, (_, i) => north + (south - north) * i / coffer.columns)
      for (const z of columns.slice(1, -1)) {
        stone.push(...flanks([radius, back], [0, glazingStart], [z - coffer.frame / 2, z + coffer.frame / 2]))
      }
      for (let column = 0; column < coffer.columns; column++) {
        const z0 = columns[column] + (column === 0 ? 0 : coffer.frame / 2)
        const z1 = columns[column + 1] - (column === coffer.columns - 1 ? 0 : coffer.frame / 2)
        for (let row = 0; row < frameRanges.length - 1; row++) {
          const a0 = frameRanges[row][1]
          const a1 = frameRanges[row + 1][0]
          // A shallow step lines each field, so the coffer reads as sunk in two stages.
          const stepRadii = [radius + coffer.depth * 0.45, back] as const
          stone.push(...flanks(stepRadii, [a0, a0 + stepWidth], [z0, z1], 1))
          stone.push(...flanks(stepRadii, [a1 - stepWidth, a1], [z0, z1], 1))
          stone.push(...flanks(stepRadii, [a0 + stepWidth, a1 - stepWidth], [z0, z0 + step]))
          stone.push(...flanks(stepRadii, [a0 + stepWidth, a1 - stepWidth], [z1 - step, z1]))
          const angle = (a0 + a1) / 2
          for (const mirrored of [angle, Math.PI - angle]) {
            const flower = template.clone()
            // The rosette’s axis turns from +y toward the vault’s axis, then it moves onto the plaster in the middle of the field.
            flower.rotateZ(mirrored + Math.PI / 2).translate(back * Math.cos(mirrored), springY + back * Math.sin(mirrored), (z0 + z1) / 2)
            gold.push(flower)
          }
        }
      }
      // The crown band is glazed: one curved pane per bay behind a grid of bronze bars.
      const bandAngles = [glazingStart, Math.PI - glazingStart] as const
      glass.push(arc([back, back + 0.02], bandAngles, [north, south]))
      const barRadii = [back - glazing.bar.depth, back] as const
      const barWidth = glazing.bar.width / back
      for (let i = 1; i < glazing.across; i++) {
        const angle = glazingStart + (Math.PI - glazingStart * 2) * i / glazing.across
        bars.push(arc(barRadii, [angle - barWidth / 2, angle + barWidth / 2], [north, south], 1))
      }
      for (let i = 1; i < glazing.along; i++) {
        const z = north + (south - north) * i / glazing.along
        bars.push(arc(barRadii, bandAngles, [z - glazing.bar.width / 2, z + glazing.bar.width / 2]))
      }
    }
    template.dispose()
    // Lunettes close both ends above the walls, each pierced by a rose window.
    const roseY = roseCenterY
    for (const side of [-1, 1]) {
      const parts = {
        clad: [] as Array<BufferGeometry>,
        stone: [] as Array<BufferGeometry>,
        gold: [] as Array<BufferGeometry>,
        roseGlass: [] as Array<BufferGeometry>,
      }
      const lunette = new Shape
      lunette.moveTo(-outerRadius, atticBottom)
      lunette.lineTo(outerRadius, atticBottom)
      lunette.lineTo(outerRadius, springY)
      lunette.absarc(0, springY, outerRadius, 0, Math.PI, false)
      lunette.lineTo(-outerRadius, atticBottom)
      const opening = new Path
      opening.absarc(0, roseY, rose.radius, 0, Math.PI * 2, true)
      lunette.holes.push(opening)
      const wall = new ExtrudeGeometry(lunette, {
        depth: rose.lunetteThickness,
        bevelEnabled: false,
        curveSegments: 96,
      })
      // Built for the north end, facing +z into the room; the south one is the same turned half around.
      parts.clad.push(wall.translate(0, 0, -halfLength - rose.lunetteThickness))
      const thickness = [-halfLength - rose.lunetteThickness, -halfLength] as const
      const middle = -halfLength - rose.lunetteThickness / 2
      const around = (radii: readonly [number, number], z: readonly [number, number], x = 0, y = 0, segments?: number) => {
        const ring = new ArcSlabGeometry({
          radii,
          angles: [0, Math.PI * 2],
          z,
          segments,
        })
        return ring.translate(x, roseY + y, 0)
      }
      const tracery = [middle - rose.tracery.depth / 2, middle + rose.tracery.depth / 2] as const
      const inner = rose.radius - rose.ring
      parts.stone.push(around([inner, rose.radius], thickness))
      parts.stone.push(around([rose.hub - rose.tracery.width, rose.hub], tracery))
      for (let i = 0; i < rose.spokes; i++) {
        const angle = i * Math.PI * 2 / rose.spokes
        const length = inner - rose.hub + rose.tracery.width
        const spoke = new BoxGeometry(length, rose.tracery.width, rose.tracery.depth)
        parts.stone.push(spoke.translate(rose.hub - rose.tracery.width / 2 + length / 2, 0, middle).rotateZ(angle).translate(0, roseY, 0))
        // Small rings between the spokes, touching both and the outer ring.
        const between = angle + Math.PI / rose.spokes
        const distance = inner - rose.foil
        parts.stone.push(around([rose.foil - rose.tracery.width * 0.8, rose.foil], tracery, distance * Math.cos(between), distance * Math.sin(between), 32))
      }
      const boss = new SphereGeometry(rose.hub * 0.55, 24, 12)
      parts.gold.push(boss.scale(1, 1, 0.45).translate(0, roseY, middle))
      const molding = new TorusGeometry(rose.radius + 0.07, 0.06, 8, 96)
      parts.gold.push(molding.translate(0, roseY, -halfLength))
      parts.roseGlass.push(around([0, inner], [middle - 0.01, middle + 0.01], 0, 0, 96))
      const targets = {
        clad,
        stone,
        gold,
        roseGlass,
      }
      for (const [key, list] of Object.entries(parts) as Array<[keyof typeof parts, Array<BufferGeometry>]>) {
        for (const part of list) {
          if (side > 0) {
            part.rotateY(Math.PI)
          }
          targets[key].push(part)
        }
      }
    }
    this.clad = mergeParts(clad)
    this.trim = mergeParts(trim)
    this.stone = mergeParts(stone)
    this.plaster = mergeParts(plaster)
    this.gold = mergeParts(gold)
    this.bars = mergeParts(bars)
    this.glass = mergeParts(glass)
    this.roseGlass = mergeParts(roseGlass)
  }

  dispose() {
    for (const geometry of [this.bars, this.clad, this.glass, this.gold, this.plaster, this.roseGlass, this.stone, this.trim]) {
      geometry.dispose()
    }
  }
}
