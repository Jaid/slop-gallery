import {BoxGeometry, BufferGeometry, CubicBezierCurve3, Float32BufferAttribute, SphereGeometry, TorusGeometry, TubeGeometry, Vector3} from 'three/webgpu'

import {mergeParts} from '../geometry.ts'
import {colliderGeometry} from './architecture.ts'
import ArcSlabGeometry from './ArcSlabGeometry.ts'
import lobbyVault from './lobbyVault.ts'

/** The solid celestial relief on the south lunette. Coordinates follow the vault, with +z facing out of the wall. */
export const lobbyTympanum = {
  baseline: lobbyVault.springY + 0.28,
  radius: lobbyVault.radius - 1,
  sunY: lobbyVault.springY + 3.45,
  sunRadius: 2.08,
  /** The component turns the relief toward −z, into the Lobby. */
  wallZ: lobbyVault.halfLength,
} as const

/** A closed, faceted relief: the outline lies in z = 0, with a raised front apex and a flat back. */
const raised = (outline: ReadonlyArray<readonly [number, number]>, center: readonly [number, number], depth: number) => {
  const positions: Array<number> = []
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i]
    const b = outline[(i + 1) % outline.length]
    positions.push(...center, depth, ...a, 0, ...b, 0, ...center, 0, ...b, 0, ...a, 0)
  }
  const geometry = new BufferGeometry
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(positions.flatMap((_, i) => (i % 3 === 0 ? [positions[i], positions[i + 1]] : [])), 2))
  geometry.computeVertexNormals()
  return geometry
}
const star = (radius: number) => raised(Array.from({length: 16}, (_, i) => {
  const angle = i * Math.PI / 8
  const reach = i % 2 ? radius * 0.27 : radius * (i % 4 ? 0.65 : 1)
  return [Math.cos(angle) * reach, Math.sin(angle) * reach] as const
}), [0, 0], 0.055)
const sill = (width: number, height: number, depth: number, y: number, z: number) => {
  const geometry = new BoxGeometry(width, height, depth)
  return geometry.translate(0, y, z)
}

/** Limestone archivolts, a blue mosaic field and gilt relief, merged into three material batches. */
export default class LobbyTympanumGeometry {
  readonly field: BufferGeometry
  readonly gold: BufferGeometry
  readonly stone: BufferGeometry

  constructor() {
    const {baseline, radius, sunRadius, sunY} = lobbyTympanum
    const stone: Array<BufferGeometry> = []
    const gold: Array<BufferGeometry> = []
    const arch = (inner: number, outer: number, front: number, back: number) => {
      const geometry = new ArcSlabGeometry({
        angles: [0, Math.PI],
        radii: [inner, outer],
        z: [front, back],
        segments: 64,
      })
      return geometry.translate(0, baseline, 0)
    }
    this.field = arch(0, radius, 0.015, 0.09)
    // Two shallow steps carry the molding around the arch and across its sill, resting on the original cornice.
    stone.push(arch(radius, radius + 0.28, 0.015, 0.2), arch(radius - 0.035, radius + 0.09, 0.12, 0.34))
    stone.push(sill((radius + 0.28) * 2, 0.28, 0.185, baseline - 0.14, 0.1075))
    stone.push(sill((radius + 0.09) * 2, 0.125, 0.22, baseline - 0.035, 0.23))
    gold.push(arch(radius - 0.15, radius - 0.08, 0.09, 0.19))
    gold.push(sill((radius - 0.08) * 2, 0.07, 0.1, baseline + 0.1, 0.14))
    const ring = (reach: number, tube: number, z: number, sides = 6) => {
      const geometry = new TorusGeometry(reach, tube, sides, 64)
      return geometry.translate(0, sunY, z)
    }
    // A pale stone halo separates the sun from the blue field; narrow gold beads finish its two edges.
    stone.push(ring(sunRadius + 0.16, 0.09, 0.14))
    gold.push(ring(sunRadius + 0.27, 0.025, 0.16, 4), ring(sunRadius + 0.055, 0.022, 0.16, 4))
    // Alternating long and short spear rays have a raised ridge, not a coplanar painted star.
    for (let i = 0; i < 32; i++) {
      const inner = 0.81
      const outer = i % 2 ? sunRadius * 0.78 : sunRadius
      const shoulder = 1.05
      const width = i % 2 ? 0.085 : 0.12
      const ray = raised([[0, inner], [width, shoulder], [0, outer], [-width, shoulder]], [0, shoulder], 0.095)
      gold.push(ray.rotateZ(i * Math.PI / 16).translate(0, sunY, 0.13))
    }
    gold.push(ring(0.78, 0.045, 0.19), ring(0.91, 0.022, 0.16, 4))
    const boss = new SphereGeometry(0.69, 32, 8, 0, Math.PI * 2, 0, Math.PI / 2)
    gold.push(boss.rotateX(Math.PI / 2).scale(1, 1, 0.32).translate(0, sunY, 0.14))
    // A pair of bowed laurel sprays, each carrying eight pairs of pointed leaves. Rotation keeps both sides identically wound.
    const leafLength = 0.64
    const leafWidth = 0.18
    const outline: Array<readonly [number, number]> = [[0, 0]]
    for (let i = 1; i < 6; i++) {
      outline.push([leafWidth * Math.sin(Math.PI * i / 6), leafLength * i / 6])
    }
    outline.push([0, leafLength])
    for (let i = 5; i > 0; i--) {
      outline.push([-leafWidth * Math.sin(Math.PI * i / 6), leafLength * i / 6])
    }
    const leaf = raised(outline, [0, leafLength * 0.48], 0.075)
    for (const side of [-1, 1]) {
      const stem = new CubicBezierCurve3(new Vector3(side * 2.35, baseline + 0.43, 0.15), new Vector3(side * 4.4, baseline + 0.6, 0.15), new Vector3(side * 5.25, baseline + 2.55, 0.15), new Vector3(side * 3.75, baseline + 4.18, 0.15))
      gold.push(new TubeGeometry(stem, 24, 0.032, 5, false))
      for (let i = 0; i < 8; i++) {
        const t = 0.12 + i * 0.105
        const point = stem.getPoint(t)
        const tangent = stem.getTangent(t)
        const angle = Math.atan2(-tangent.x, tangent.y)
        for (const branch of [-1, 1]) {
          const scale = 1 - i * 0.025
          gold.push(leaf.clone().scale(scale, scale, 1).rotateZ(angle + branch * 0.87).translate(point.x, point.y, point.z))
        }
      }
      const tip = stem.getPoint(1)
      const tangent = stem.getTangent(1)
      gold.push(leaf.clone().scale(0.75, 0.75, 1).rotateZ(Math.atan2(-tangent.x, tangent.y)).translate(tip.x, tip.y, tip.z))
    }
    leaf.dispose()
    // Five stars follow the upper arch. Three small lozenges finish the sill below the sun.
    for (const angle of [0.72, 1.12, Math.PI / 2, Math.PI - 1.12, Math.PI - 0.72]) {
      const reach = radius - 0.58
      gold.push(star(angle === Math.PI / 2 ? 0.38 : 0.28).translate(Math.cos(angle) * reach, baseline + Math.sin(angle) * reach, 0.105))
    }
    for (const x of [-0.36, 0, 0.36]) {
      gold.push(raised([[0, -0.08], [0.05, 0], [0, 0.08], [-0.05, 0]], [0, 0], 0.035).translate(x, baseline + 0.28, 0.105))
    }
    this.stone = mergeParts(stone)
    this.gold = mergeParts(gold)
  }

  /** Exact fixed collision for the shallow relief, including the field in front of the existing solid wall. */
  collision() {
    const merged = mergeParts([this.field, this.stone, this.gold].map(part => {
      const copy = new BufferGeometry
      return copy.copy(part)
    }))
    try {
      return colliderGeometry(merged)
    } finally {
      merged.dispose()
    }
  }

  dispose() {
    this.field.dispose()
    this.stone.dispose()
    this.gold.dispose()
  }
}
