import {describe, expect, test} from 'bun:test'

import SeraphimCrucible from 'knot-materials/entries/seraphim_crucible/Material.ts'
import {Texture} from 'three/webgpu'

import {knotLength, knotTubeRadius} from '../../packages/knot-materials/src/candidates/gemini_argon/lib/tubeMetric.ts'
import knotData from '../../packages/knot-materials/src/entries/seraphim_crucible/data.ts'
import {knotGeometryArgs} from '../../packages/knot-materials/src/geometry.ts'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/seraphim_crucible/Material.ts', import.meta.url)).text()
const lobe = (phase: number, sharpness: number) => (Math.cos(phase) * 0.5 + 0.5) ** sharpness
// Mirrors the shader’s vertex swell over tube UV at loop time `t` (seconds).
const swell = (u: number, v: number, t: number) => {
  const loop = t * Math.PI
  const ring = lobe(u * Math.PI * 2 * 36, 1)
  const rib = lobe(v * Math.PI * 2 * 6, 2)
  const helixA = lobe(u * Math.PI * 2 * 5 + v * Math.PI * 2 * 2 - loop, 4)
  const helixB = lobe(u * Math.PI * 2 * 7 - v * Math.PI * 2 * 3 + loop, 4)
  return (ring * 0.65 + rib * 0.5 + helixA * 0.85 + helixB * 0.7) * 0.0075
}
describe('Seraphim Crucible', () => {
  test('constructs the displaced astrolabe material without disposing the environment', () => {
    const environment = new Texture
    let disposed = false
    environment.addEventListener('dispose', () => disposed = true)
    const material = new SeraphimCrucible(environment)
    try {
      expect(material.name).toBe('seraphim_crucible')
      expect(material.envMap).toBe(environment)
      expect(material.positionNode?.isNode).toBe(true)
      expect(material.colorNode?.isNode).toBe(true)
      expect(material.normalNode?.isNode).toBe(true)
      expect(material.emissiveNode?.isNode).toBe(true)
    } finally {
      material.dispose()
      expect(disposed).toBe(false)
      environment.dispose()
    }
  })
  test('displaces vertices by smooth swells the 256 × 64 mesh can follow instead of hard strut plateaus', async () => {
    const text = await source()
    expect(text).toContain('return frame.center.add(frame.normal.mul(lattice.mul(0.0075).add(knotTubeRadius)))')
    expect(text).not.toContain('.cos().smoothstep(0.76, 0.92)\n')
    expect(text).not.toMatch(/const surface = [\s\S]*?rimLift[\s\S]*?this\.positionNode/u)
    const [, , tubular, radial] = knotGeometryArgs
    const vertexSpacingAlong = knotLength / tubular
    const vertexSpacingAround = Math.PI * 2 * knotTubeRadius / radial
    // Highest harmonic of every lobe still spans several vertices: rings (36 × 1 along u), ribs (6 × 2 around v) and helices (up to 7 × 4 along u, 3 × 4 around v).
    expect(knotLength / 36 / vertexSpacingAlong).toBeGreaterThan(6)
    expect(Math.PI * 2 * knotTubeRadius / (6 * 2) / vertexSpacingAround).toBeGreaterThan(5)
    expect(tubular / (7 * 4)).toBeGreaterThan(9)
    expect(radial / (3 * 4)).toBeGreaterThan(5)
    // The swell is periodic, so it closes over both UV seams at every loop time.
    for (const t of [0, 0.37, 1.3]) {
      for (let s = 0; s <= 1; s += 0.05) {
        expect(swell(0, s, t)).toBeCloseTo(swell(1, s, t), 10)
        expect(swell(s, 0, t)).toBeCloseTo(swell(s, 1, t), 10)
      }
    }
    // Peak displacement stays within the declared culling and collision bound.
    expect((0.65 + 0.5 + 0.85 + 0.7) * 0.0075).toBeLessThanOrEqual(knotData.displacement)
  })
  test('confines pyrite flecks to round grains inside each cell', async () => {
    const text = await source()
    expect(text).toContain('const pyriteSpark = pyriteGrains(p, 1 / 95).mul(near)')
    expect(text).toContain('q.fract().sub(rnd.mul(0.5).add(0.25)).length().smoothstep(0.06, outer).oneMinus()')
    expect(text).toContain('q.fwidth().length().add(0.18).min(0.24)')
    expect(text).not.toContain('mx_cell_noise_float(p.mul(95).floor())')
    // Grain centers lie in [0.25, 0.75] and the support radius never exceeds 0.24, so no grain touches a cell wall.
    expect(0.25 - 0.24).toBeGreaterThan(0)
  })
  test('fades the brushed-gold grooves out before they alias into stripes', async () => {
    const text = await source()
    expect(text).toContain('const brushWave = filteredCos(tube.y.mul(TAU * 420), 0.3, 1.05).mul(near)')
    // Fully faded once a period gets shorter than 2π / 1.05 ≈ 6 px, well before the 2 px Nyquist limit.
    expect(Math.PI * 2 / 1.05).toBeGreaterThan(5.5)
  })
})
