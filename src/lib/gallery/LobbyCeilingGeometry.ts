import type {BufferGeometry} from 'three/webgpu'

import {BoxGeometry, ExtrudeGeometry, Matrix4, Path, Shape, SphereGeometry, TorusGeometry, Vector3} from 'three/webgpu'

import {mergeParts} from '../geometry.ts'
import ceiling, {lobbyBays, lobbyRibs} from './lobbyCeiling.ts'
import PolylineTubeGeometry from './railings/PolylineTubeGeometry.ts'

const {radius, spring, halfDepth, thickness, rose, clerestory} = ceiling
const crownStart = Math.PI / 2 - ceiling.skylightAngle
const crownEnd = Math.PI / 2 + ceiling.skylightAngle
const box = (w: number, h: number, d: number, x: number, y: number, z: number) => {
  const geometry = new BoxGeometry(w, h, d)
  return geometry.translate(x, y, z)
}

/** A solid, smoothly shaded annular sector. Unlike a scaled torus, its radial section and end reveals stay rectangular. */
export function vaultSector(from: number, to: number, r: number, depth: number, length: number, z: number) {
  const geometry = new BoxGeometry(to - from, depth, length, Math.max(1, Math.ceil((to - from) * 48)), 1, 1)
  const positions = geometry.getAttribute('position')
  const normals = geometry.getAttribute('normal')
  for (let i = 0; i < positions.count; i++) {
    const angle = positions.getX(i) + (from + to) / 2
    const radial = r + positions.getY(i)
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    positions.setXYZ(i, radial * cos, spring + radial * sin, positions.getZ(i) + z)
    const tangent = normals.getX(i)
    const normal = normals.getY(i)
    normals.setXYZ(i, normal * cos - tangent * sin, normal * sin + tangent * cos, normals.getZ(i))
  }
  // The angle/radius parameterization reverses handedness.
  const index = geometry.index!
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i)
    index.setX(i, index.getX(i + 1))
    index.setX(i + 1, a)
  }
  return geometry
}

/** Clerestory aperture in the long walls, expressed in wall-local horizontal/vertical coordinates. */
export function clerestoryShape(center: number) {
  const shape = new Shape
  const r = clerestory.width / 2
  // A shallow segmental arch, rather than a semicircle, leaves generous clear glass below it.
  shape.moveTo(center - r, clerestory.bottom)
  shape.lineTo(center + r, clerestory.bottom)
  shape.lineTo(center + r, clerestory.top - 0.65)
  shape.quadraticCurveTo(center + r, clerestory.top, center, clerestory.top)
  shape.quadraticCurveTo(center - r, clerestory.top, center - r, clerestory.top - 0.65)
  shape.closePath()
  return shape
}
const extrude = (shape: Shape, depth: number) => new ExtrudeGeometry(shape, {
  depth,
  bevelEnabled: false,
  curveSegments: 32,
})
const ring = (r: number, tube: number, x: number, y: number, z: number) => {
  const geometry = new TorusGeometry(r, tube, 8, 96)
  return geometry.translate(x, y, z)
}

/** Round barrel vault, open glazed crown, pierced clerestory and rose windows. All openings are actual holes, not emissive ceiling paintings. */
export default class LobbyCeilingGeometry {
  readonly bars: BufferGeometry
  readonly glass: BufferGeometry
  readonly gold: BufferGeometry
  readonly plaster: BufferGeometry
  readonly ribs: BufferGeometry

  constructor() {
    const plaster: Array<BufferGeometry> = []
    const ribs: Array<BufferGeometry> = []
    const gold: Array<BufferGeometry> = []
    const bars: Array<BufferGeometry> = []
    const glass: Array<BufferGeometry> = []
    // Roof fields and their recessed, double-stepped coffer frames, four panels on each flank of each bay.
    for (const bay of lobbyBays) {
      const startZ = bay.start + ceiling.ribWidth / 2
      const endZ = bay.end - ceiling.ribWidth / 2
      for (const [a, b] of [[0, crownStart], [crownEnd, Math.PI]]) {
        plaster.push(vaultSector(a, b, radius + thickness / 2, thickness, endZ - startZ, bay.center))
        for (let panel = 0; panel < 4; panel++) {
          const from = a + (b - a) * panel / 4 + 0.018
          const to = a + (b - a) * (panel + 1) / 4 - 0.018
          for (const angle of [from, to]) {
            ribs.push(vaultSector(angle - 0.013, angle + 0.013, radius - 0.055, 0.11, endZ - startZ, bay.center))
            gold.push(vaultSector(angle - 0.002, angle + 0.002, radius - 0.12, 0.018, endZ - startZ - 0.22, bay.center))
          }
          for (const z of [startZ + 0.12, endZ - 0.12]) {
            ribs.push(vaultSector(from, to, radius - 0.055, 0.11, 0.24, z))
            gold.push(vaultSector(from + 0.02, to - 0.02, radius - 0.12, 0.018, 0.028, z))
          }
          // Small carved floral paterae: local +z faces inward, tangent to the vault.
          const angle = (from + to) / 2
          const normal = new Vector3(-Math.cos(angle), -Math.sin(angle), 0)
          const transform = new Matrix4
          transform.lookAt(new Vector3, normal.clone().negate(), new Vector3(0, 0, 1))
          transform.setPosition((radius - 0.03) * Math.cos(angle), spring + (radius - 0.03) * Math.sin(angle), bay.center)
          for (let petal = 0; petal < 8; petal++) {
            const turn = petal * Math.PI / 4
            const leaf = new SphereGeometry(1, 8, 6)
            leaf.scale(0.07, 0.22, 0.045).translate(0, 0.17, 0).rotateZ(turn).applyMatrix4(transform)
            ribs.push(leaf)
          }
          const boss = new SphereGeometry(0.085, 12, 8)
          gold.push(boss.scale(1, 1, 0.55).applyMatrix4(transform))
        }
      }
      // Curved clear glass is open to the sky. Closely spaced bronze mullions follow the roof, without an opaque backing slab.
      glass.push(vaultSector(crownStart, crownEnd, radius + 0.025, 0.012, endZ - startZ, bay.center))
      for (let i = 0; i <= 4; i++) {
        const angle = crownStart + (crownEnd - crownStart) * i / 4
        bars.push(vaultSector(angle - 0.0025, angle + 0.0025, radius - 0.01, 0.08, endZ - startZ, bay.center))
      }
      for (let z = startZ; z <= endZ + 0.01; z += (endZ - startZ) / 4) {
        bars.push(vaultSector(crownStart, crownEnd, radius - 0.01, 0.08, 0.045, z))
      }
    }
    for (const z of lobbyRibs) {
      ribs.push(vaultSector(0, Math.PI, radius - 0.11, 0.32, ceiling.ribWidth, z))
      for (const side of [-1, 1]) {
        gold.push(vaultSector(0, Math.PI, radius - 0.28, 0.022, 0.026, z + side * 0.12))
        // Engaged fluted pilasters and layered capitals in the new upper story only, leaving all artwork below intact.
        ribs.push(box(0.42, spring - ceiling.wallTop, 0.52, side * (radius - 0.12), (spring + ceiling.wallTop) / 2, z))
        for (let j = -1; j <= 1; j++) {
          gold.push(box(0.015, 1.35, 0.025, side * (radius - 0.34), 6.85, z + j * 0.13))
        }
        for (const [y, width, height] of [[5.92, 0.78, 0.16], [7.7, 0.64, 0.16], [7.88, 0.86, 0.2]]) {
          ribs.push(box(0.56, height, width, side * (radius - 0.12), y, z))
        }
      }
    }
    // Long clerestory walls: the holes and the glass come from the exact same paths.
    for (const side of [-1, 1]) {
      const wall = new Shape
      wall.moveTo(-halfDepth, 5.5).lineTo(halfDepth, 5.5).lineTo(halfDepth, spring).lineTo(-halfDepth, spring).closePath()
      for (const bay of lobbyBays) {
        const opening = clerestoryShape(bay.center)
        wall.holes.push(new Path(opening.getPoints(32)))
        const pane = extrude(opening, 0.012).translate(0, 0, -0.006)
        glass.push(pane.rotateY(Math.PI / 2).translate(side * (radius + 0.08), 0, 0))
        const path = opening.getPoints(16).map(p => new Vector3(side * (radius - 0.025), p.y, -p.x))
        bars.push(new PolylineTubeGeometry(path, 0.045, 8))
        for (const offset of [-0.52, 0.52]) {
          bars.push(box(0.07, 1.5, 0.035, side * (radius + 0.025), 6.83, -bay.center + offset))
        }
      }
      plaster.push(extrude(wall, thickness).translate(0, 0, -thickness / 2).rotateY(Math.PI / 2).translate(side * (radius + thickness / 2), 0, 0))
      for (const [y, h, projection] of [[5.64, 0.22, 0.3], [5.85, 0.12, 0.42], [7.96, 0.16, 0.38]]) {
        ribs.push(box(projection, h, halfDepth * 2, side * (radius - projection / 2), y, 0))
        gold.push(box(0.025, 0.025, halfDepth * 2, side * (radius - projection - 0.015), y, 0))
      }
    }
    // End tympana with a true rose opening. Both ends close the volume down to the original stone wall.
    for (const side of [-1, 1]) {
      const end = new Shape
      end.moveTo(-radius, 5.5).lineTo(radius, 5.5).lineTo(radius, spring)
      end.absarc(0, spring, radius, 0, Math.PI, false).lineTo(-radius, 5.5).closePath()
      const hole = new Path
      end.holes.push(hole.absarc(0, rose.y, rose.radius, 0, Math.PI * 2, true))
      plaster.push(extrude(end, thickness).translate(0, 0, side * halfDepth - thickness / 2))
      const pane = new Shape
      pane.absarc(0, rose.y, rose.radius, 0, Math.PI * 2, false)
      glass.push(extrude(pane, 0.012).translate(0, 0, side * halfDepth))
      for (const [r, tube] of [[rose.radius + 0.22, 0.14], [rose.radius + 0.04, 0.045]]) {
        ribs.push(ring(r, tube, 0, rose.y, side * (halfDepth - 0.1)))
      }
      for (const r of [rose.radius + 0.13, rose.radius * 0.45, 0.26]) {
        gold.push(ring(r, 0.035, 0, rose.y, side * (halfDepth - 0.17)))
      }
      for (let i = 0; i < 12; i++) {
        const angle = i * Math.PI / 6
        const spoke = box(0.055, rose.radius - 0.26, 0.08, 0, (rose.radius + 0.26) / 2, 0).rotateZ(angle).translate(0, rose.y, side * (halfDepth - 0.08))
        bars.push(spoke)
        const r = rose.radius * 0.27
        const petal = new TorusGeometry(r, 0.035, 8, 40)
        petal.scale(0.58, 1, 1).translate(0, rose.radius * 0.7, 0).rotateZ(angle).translate(0, rose.y, side * (halfDepth - 0.09))
        bars.push(petal)
      }
    }
    this.plaster = mergeParts(plaster)
    this.ribs = mergeParts(ribs)
    this.gold = mergeParts(gold)
    this.bars = mergeParts(bars)
    this.glass = mergeParts(glass)
  }

  dispose() {
    for (const geometry of [this.plaster, this.ribs, this.gold, this.bars, this.glass]) {
      geometry.dispose()
    }
  }
}
