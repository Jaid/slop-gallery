import {expect, test} from 'bun:test'

import {knotsById} from 'knot-materials'
import {knotGeometryArgs} from 'knot-materials/geometry.ts'

// The declared displacement bounds culling and collision, so it must cover each shader’s worst case.
const displacement = (id: string) => knotsById.get(id)!.displacement!
test('relief entries scale their unit relief by the declared centimeter bound', async () => {
  for (const id of ['gilded_ruin', 'restless_caldera']) {
    const source = await Bun.file(new URL(`../../packages/knot-materials/src/entries/${id}/Material.ts`, import.meta.url)).text()
    expect(source).toContain('mul(knotData.displacement)')
  }
  expect(displacement('gilded_ruin')).toBe(0.02)
  expect(displacement('restless_caldera')).toBe(0.03)
  expect((0.55 + 0.14) * 0.02).toBeLessThan(0.02)
  expect((0.6 + 0.26) * 0.03).toBeLessThan(0.03)
})
test('bounds combined spike fields, sideways lean and accumulated noise octaves', () => {
  const [radius, tube] = knotGeometryArgs
  const maximumPointRadius = radius * 1.5 + tube
  const swelling = maximumPointRadius * (Math.hypot(2.1, -1.4, 1.7) + 0.45 * Math.hypot(-3.4, 2.6, 1.2)) * 0.004
  const spikes = (0.062 + 0.0195) * 0.85 * 1.22 * 1.15 * 1.04
  expect(displacement('ferro_tide')).toBeGreaterThanOrEqual(swelling + spikes)
  const sheet = 1 + 0.5 + 0.25
  const normal = 0.046 + (sheet * 0.4 + 0.6) * 0.0022
  const sideways = Math.hypot(1, 0.35) * 0.019
  expect(displacement('loadstone')).toBeGreaterThanOrEqual(Math.hypot(normal, sideways))
  expect(displacement('reticle')).toBeGreaterThanOrEqual(0.0012 * (1 + 0.5))
  expect(displacement('cilia')).toBeGreaterThanOrEqual(0.0012 * (1 + 0.5) + 0.0005)
})
test('bounds the octagonal inset and worst-case magnetic and droplet displacement', () => {
  expect(displacement('brilliant_cut')).toBeGreaterThanOrEqual(0.13 * (1 - Math.cos(Math.PI / 8)))
  expect(displacement('magnetic_diadem')).toBeGreaterThanOrEqual(Math.hypot(0.066 * 1.1 - 0.018, 0.066 * 1.1 * 0.5))
  expect(displacement('magnetic_bloom')).toBeGreaterThanOrEqual(Math.hypot(0.078, 0.078 * 0.55))
  const large = 0.03 * 0.95 * 1.14 + Math.log(9) / 170
  const small = 0.0085 * 0.95 * 1.14 + Math.log(9) / 420
  expect(displacement('mercury_rain')).toBeGreaterThanOrEqual(large + small)
})
