import {describe, expect, test} from 'bun:test'

import RadenMakiE from 'knot-materials/entries/raden_maki_e/Material.ts'
import {Texture} from 'three/webgpu'

import {knotCircumference, knotLength} from '../../packages/knot-materials/src/candidates/gemini_argon/lib/tubeMetric.ts'
import knotData from '../../packages/knot-materials/src/entries/raden_maki_e/data.ts'
import {knotGeometryArgs} from '../../packages/knot-materials/src/geometry.ts'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/raden_maki_e/Material.ts', import.meta.url)).text()
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1)
  return t * t * (3 - 2 * t)
}
const fanRadius = 0.68
const fanAspect = 1.12
// Mirrors the shader’s candidate order, relative to the cell’s lower-left corner.
const fanCenters = [[0.5, -0.5], [0, 0], [1, 0], [-0.5, 0.5], [0.5, 0.5], [1.5, 0.5], [0, 1], [1, 1]]
const domeCenters = [...fanCenters, [0.5, 1.5]]
const fanDistance = (x: number, y: number, cx: number, cy: number) => Math.hypot(x - cx, (y - cy) * fanAspect)
// Mirrors seigaihaField: the first candidate that covers the point wins.
const shaderFan = (x: number, y: number) => {
  const bx = Math.floor(x)
  const by = Math.floor(y)
  for (const [ox, oy] of fanCenters) {
    if (fanDistance(x, y, bx + ox, by + oy) < fanRadius) {
      return [bx + ox, by + oy]
    }
  }
  return null
}
// Reference over the whole lattice (rows half a cell apart, odd rows offset by half a cell): the lowest row is in front, then the leftmost scale.
const referenceFan = (x: number, y: number) => {
  let best: Array<number> | null = null
  for (let k = Math.floor(y * 2) - 3; k <= Math.floor(y * 2) + 3; k++) {
    const cy = k / 2
    const offset = Math.abs(k % 2) === 1 ? 0.5 : 0
    for (let n = Math.floor(x) - 3; n <= Math.floor(x) + 3; n++) {
      const cx = n + offset
      if (fanDistance(x, y, cx, cy) < fanRadius && (!best || cy < best[1] || cy === best[1] && cx < best[0])) {
        best = [cx, cy]
      }
    }
  }
  return best
}
// Mirrors displacedMakiE, in units of domeHeight.
const dome = (x: number, y: number) => {
  const lx = x - Math.floor(x)
  const ly = y - Math.floor(y)
  return domeCenters.reduce((sum, [cx, cy]) => sum + (1 - smoothstep(0, fanRadius, fanDistance(lx, ly, cx, cy))) ** 2, 0)
}
describe('Raden Maki-e', () => {
  test('constructs the lacquer material without disposing the environment', () => {
    const environment = new Texture
    let disposed = false
    environment.addEventListener('dispose', () => disposed = true)
    const material = new RadenMakiE(environment)
    try {
      expect(material.name).toBe('raden_maki_e')
      expect(material.envMap).toBe(environment)
      expect(material.positionNode?.isNode).toBe(true)
      expect(material.colorNode?.isNode).toBe(true)
      expect(material.normalNode?.isNode).toBe(true)
    } finally {
      material.dispose()
      expect(disposed).toBe(false)
      environment.dispose()
    }
  })
  test('picks the same Seigaiha scale on both sides of every cell edge', () => {
    let state = 1
    const random = () => {
      state = state * 48_271 % 2_147_483_647
      return state / 2_147_483_647
    }
    for (let index = 0; index < 20_000; index++) {
      const x = random() * 22
      const y = random() * 3
      expect(shaderFan(x, y)).toEqual(referenceFan(x, y))
    }
  })
  test('displaces vertices by smooth scale domes instead of the thin gold beads', async () => {
    const text = await source()
    expect(text).toContain('dome = dome.add(r.smoothstep(0, fanRadius).oneMinus().pow2())')
    expect(text).toContain('return position.add(normal.mul(dome.mul(domeHeight)))')
    const vertexStage = text.slice(text.indexOf('const displacedMakiE'), text.indexOf('\n})', text.indexOf('const displacedMakiE')))
    expect(vertexStage).not.toContain('seigaihaField')
    expect(vertexStage).not.toContain('Gaussian')
    const cellAlong = knotLength / 22
    const vertexSpacing = knotLength / knotGeometryArgs[2]
    // The gold beads (half-width under 0.03 of the fan radius) are far narrower than a vertex step, while a dome spans many.
    expect(0.03 * fanRadius * cellAlong).toBeLessThan(vertexSpacing)
    expect(fanRadius * cellAlong).toBeGreaterThan(vertexSpacing * 6)
    expect(fanRadius / fanAspect * knotCircumference / 3).toBeGreaterThan(knotCircumference / knotGeometryArgs[3] * 6)
    // The dome sum continues across cell edges with matching value and slope.
    const e = 1e-5
    let peak = 0
    for (let t = 0; t < 1; t += 0.01) {
      expect(Math.abs(dome(1 - e, t) - dome(1 + e, t))).toBeLessThan(1e-3)
      expect(Math.abs(dome(t, 1 - e) - dome(t, 1 + e))).toBeLessThan(1e-3)
      expect(Math.abs(dome(1 - e, t) - dome(1 - 2 * e, t) - (dome(1 + 2 * e, t) - dome(1 + e, t))) / e).toBeLessThan(1e-2)
      expect(Math.abs(dome(t, 1 - e) - dome(t, 1 - 2 * e) - (dome(t, 1 + 2 * e) - dome(t, 1 + e))) / e).toBeLessThan(1e-2)
      for (let s = 0; s < 1; s += 0.01) {
        peak = Math.max(peak, dome(t, s))
      }
    }
    expect(text).toContain('const domeHeight = 0.0015')
    expect(peak * 0.0015).toBeLessThanOrEqual(knotData.displacement)
  })
  test('keeps every polygonal gold flake inside its cell', async () => {
    const text = await source()
    expect(text).toContain('const center = rnd.mul(0.4).add(0.3)')
    // Widest reach of a flake (largest size 0.19, stretched up to 1.8×) over all rotations, along a cell axis.
    let reach = 0
    for (let rotation = 0; rotation < Math.PI; rotation += 0.01) {
      for (const stretchX of [0.95, 1.8]) {
        for (const stretchY of [0.95, 1.8]) {
          for (let direction = 0; direction < Math.PI * 2; direction += 0.01) {
            let low = 0
            let high = 1
            for (let step = 0; step < 32; step++) {
              const middle = (low + high) / 2
              const dx = Math.cos(direction) * middle
              const dy = Math.sin(direction) * middle
              const rx = (dx * Math.cos(rotation) - dy * Math.sin(rotation)) * stretchX
              const ry = (dx * Math.sin(rotation) + dy * Math.cos(rotation)) * stretchY
              if (Math.max(Math.abs(rx), Math.abs(ry), Math.abs(rx + ry) * 0.7) < 0.19) {
                low = middle
              } else {
                high = middle
              }
            }
            reach = Math.max(reach, Math.abs(Math.cos(direction)) * low, Math.abs(Math.sin(direction)) * low)
          }
        }
      }
    }
    expect(reach).toBeLessThan(0.3)
  })
})
