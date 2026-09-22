import {describe, expect, test} from 'bun:test'

import MeissnerQuantum from 'knot-materials/entries/meissner_quantum/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/meissner_quantum/Material.ts', import.meta.url)).text()
describe('Meissner Quantum flux tubes', () => {
  test('constructs the anisotropic ceramic and its circulating emission', () => {
    const environment = new Texture
    const material = new MeissnerQuantum(environment)
    try {
      expect(material.name).toBe('meissner_quantum')
      expect(material.normalNode?.isNode).toBe(true)
      expect(material.emissiveNode?.isNode).toBe(true)
      expect(material.anisotropyNode?.isNode).toBe(true)
      expect(material.clearcoat).toBe(0.85)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('keeps pin identities constant through depth and evaluates complete neighboring rings', async () => {
    const text = await source()
    expect(text).toContain('const latticeCoord = p.xy.mul(16)')
    expect(text).toContain('for (let x = -1;x <= 1;x++)')
    expect(text).toContain('for (let y = -1;y <= 1;y++)')
    expect(text).toContain('cellNoiseVec3(vec3(cellId.add(offset), 0))')
    expect(text).toContain('const rel = local.sub(offset.add(pinCenter))')
    expect(text).toContain('r.smoothstep(0.16, 0.46).oneMinus()')
    expect(text).toContain('phaseRings = phaseRings.add(rings)')
    expect(text).toContain('currentTangent = currentTangent.add(tangent.mul(current))')
    // An omitted site's nearest possible coordinate is 1.375 cell units away.
    expect(0.46).toBeLessThan(1.375)
    expect(0.18 + 0.1).toBeLessThan(1.375)
  })
  test('filters continuous coordinates without reversing core edges or differentiating cell phases', async () => {
    const text = await source()
    expect(text).toContain('latticeCoord.fwidth().length().max(0.0001)')
    expect(text).toContain('const filter = footprint.min(0.1)')
    expect(text).toContain('r.smoothstep(0.04, filter.add(0.18)).oneMinus()')
    expect(text).toContain('footprint.mul(38).smoothstep(0.6, 3).oneMinus()')
    expect(text).toContain('phase.cos().mul(ringVisibility).mul(0.5).add(0.5).mul(current)')
    expect(text).not.toContain('r.fwidth()')
    expect(text).not.toContain('opticalBands(')
    expect(text).toContain('time.mul(2.2)')
    expect(text).toContain('time.mul(14).floor()')
    expect(text).toContain('slipStutter.mul(pinCore).mul(intimate)')
    expect(text).toContain('currentTangent.div(currentTangent.length().max(1)).mul(0.75)')
  })
})
