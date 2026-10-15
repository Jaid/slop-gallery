import {describe, expect, test} from 'bun:test'

import AventurineEnamel from 'knot-materials/entries/aventurine_enamel/Material.ts'
import {Texture} from 'three/webgpu'

import {knotTubeRadius} from '../../packages/knot-materials/src/candidates/gemini_argon/lib/tubeMetric.ts'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/aventurine_enamel/Material.ts', import.meta.url)).text()
const constant = (text: string, name: string) => {
  const pattern = new RegExp(String.raw`const ${name} = ([\d.]+)`, 'u')
  return Number(pattern.exec(text)![1])
}
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1)
  return t * t * (3 - 2 * t)
}
const TAU = Math.PI * 2
const petalIndex = (angle: number) => (Math.floor(angle / TAU * 8 + 4.5) % 8 + 8) % 8
const spokeDistance = (angle: number, r: number) => Math.sqrt(Math.cos(angle * 4) ** 2 + 0.0004) * r
// Mirrors the shader’s rose-engine relief over a cell-local offset q ∈ [−0.5, 0.5]², unfiltered.
const lathe = (x: number, y: number) => {
  const r = Math.hypot(x, y)
  const angle = Math.atan2(y, x + 1e-6)
  const cornerX = Math.abs(x) - 0.5
  const cornerY = Math.abs(y) - 0.5
  const cornerR = Math.hypot(cornerX, cornerY)
  const cornerAngle = Math.atan2(cornerY, cornerX + 1e-6)
  const isCorner = cornerR - (Math.cos(cornerAngle * 4) * 0.024 + 0.215) < 0
  const offsetX = x - Math.sign(x) * 0.5
  const offsetY = y - Math.sign(y) * 0.5
  const latheR = isCorner ? cornerR : r
  const latheAngle = isCorner ? Math.atan2(offsetY, offsetX + 1e-6) : angle
  const wobble = 1 - smoothstep(0.4, 0.5, Math.max(Math.abs(x), Math.abs(y)))
  const sunPhase = latheAngle * 40 + Math.sin(latheR * 110) * wobble * 0.85
  const ringPhase = latheR * 96 + Math.cos(latheAngle * 24) * 0.45
  return (1 - Math.abs(Math.sin(sunPhase)) ** 0.75) * 0.58 + (1 - Math.abs(Math.sin(ringPhase)) ** 0.75) * 0.42
}
describe('Aventurine Enamel', () => {
  test('constructs the material without disposing the environment', () => {
    const environment = new Texture
    let disposed = false
    environment.addEventListener('dispose', () => disposed = true)
    const material = new AventurineEnamel(environment)
    try {
      expect(material.name).toBe('aventurine_enamel')
      expect(material.envMap).toBe(environment)
      expect(material.colorNode?.isNode).toBe(true)
      expect(material.normalNode?.isNode).toBe(true)
      expect(material.emissiveNode?.isNode).toBe(true)
    } finally {
      material.dispose()
      expect(disposed).toBe(false)
      environment.dispose()
    }
  })
  test('runs the petal divider wires along the petal color boundaries', async () => {
    const text = await source()
    expect(text).toContain('const spokeCos = angle.mul(4).cos()')
    expect(text).toContain('const petalIndex = angle.div(TAU).mul(8).add(4.5).floor().mod(8)')
    for (let k = 0; k < 8; k++) {
      const boundary = (k * 45 + 22.5) / 360 * TAU - Math.PI
      // The color changes across every divider, and the divider sits right on that change.
      expect(petalIndex(boundary - 1e-4)).not.toBe(petalIndex(boundary + 1e-4))
      expect(spokeDistance(boundary, 0.3)).toBeLessThan(0.016)
      // No divider runs through the middle of a petal, where the color stays the same.
      const middle = boundary + TAU / 16
      expect(petalIndex(middle - 0.1)).toBe(petalIndex(middle + 0.1))
      expect(spokeDistance(middle, 0.3)).toBeGreaterThan(0.25)
    }
  })
  test('keeps every aventurine platelet a whole polygon inside its cell', async () => {
    const text = await source()
    const support = constant(text, 'aventurineSupport')
    const [minimum, span] = /const aventurineJitter = \[(?<minimum>[\d.]+), (?<span>[\d.]+)\]/u.exec(text)!.slice(1).map(Number)
    expect(text).toContain('const outer = radius.add(aa.mul(0.5)).min(aventurineSupport)')
    expect(text).toContain('const crystal = lensDist.smoothstep(inner, outer).oneMinus()')
    // The platelet lies in the enamel plane instead of being an object-axis block that the curved surface slices into rectangles.
    expect(text).toContain('const across = d.dot(normal)')
    expect(text).toContain('const lensDist = polygon.pow2().add(across.pow2()).sqrt()')
    expect(text).not.toContain('hexDist')
    // Both polygon gauges are scaled to their circumradius, so the lens gauge never undershoots the 3D distance from the center: the whole platelet stays inside a sphere of radius `support`.
    const hexagon = (x: number, y: number) => Math.max(Math.abs(x), Math.abs(x * 0.5 + y * 0.866), Math.abs(x * 0.5 - y * 0.866)) * 2 / Math.sqrt(3)
    const triangle = (x: number, y: number) => Math.max(y, x * 0.866 - y * 0.5, x * -0.866 - y * 0.5) * 2
    for (let index = 0; index < 4000; index++) {
      const angle = index * 2.399963
      const length = (index % 97 + 1) / 97
      const x = Math.cos(angle) * length
      const y = Math.sin(angle) * length
      expect(hexagon(x, y)).toBeGreaterThanOrEqual(length * 0.9995)
      expect(triangle(x, y)).toBeGreaterThanOrEqual(length * 0.9995)
    }
    // The gauges are tight at the vertices, so the shapes really are a hexagon and a triangle with circumradius 1.
    expect(hexagon(Math.cos(Math.PI / 6), Math.sin(Math.PI / 6))).toBeCloseTo(1, 3)
    expect(triangle(0, -1)).toBeCloseTo(1, 3)
    const margin = Math.min(minimum, 1 - minimum - span)
    expect(support).toBeLessThan(margin)
  })
  test('keeps the guilloché foil shallow and continuous across cell edges', async () => {
    const text = await source()
    const depth = constant(text, 'foilDepth')
    expect(text).toContain('const refractedCells = cells.sub(ray.mul(foilDepth))')
    expect(depth).toBeLessThan(knotTubeRadius / 4)
    // Neighboring cells meet mirrored, so the relief has to match on both sides of every edge, including inside the corner cartouches.
    // The V-grooves (|sin|^0.75) are steep at their bottoms, so continuity is probed very close to the edge. The 1e-3 tolerance covers the 1e-6 offset inside atan; an actual seam is ~0.5.
    const e = 1e-13
    for (let t = -0.5 + 0.0123; t < 0.5; t += 0.0137) {
      expect(Math.abs(lathe(0.5 - e, t) - lathe(-0.5 + e, t))).toBeLessThan(1e-3)
      expect(Math.abs(lathe(t, 0.5 - e) - lathe(t, -0.5 + e))).toBeLessThan(1e-3)
    }
    // Each corner cartouche is turned around its own center, not around the centers of the four rosettes it straddles.
    expect(text).toContain('const latheR = select(latheCorner, deep.cornerR, deep.r)')
    expect(text).toContain('const latheAngle = select(latheCorner, deep.cornerTurn, deep.angle)')
    expect(text).toContain('const cornerOffset = q.sub(q.sign().mul(0.5))')
  })
})
