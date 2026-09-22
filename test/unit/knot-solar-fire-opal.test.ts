import {describe, expect, test} from 'bun:test'

import SolarFireOpal from 'knot-materials/entries/solar_fire_opal/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/solar_fire_opal/Material.ts', import.meta.url)).text()
describe('Solar Fire Opal inclusions', () => {
  test('constructs the polished obsidian host and spectral emission', () => {
    const environment = new Texture
    const material = new SolarFireOpal(environment)
    try {
      expect(material.name).toBe('solar_fire_opal')
      expect(material.colorNode?.isNode).toBe(true)
      expect(material.emissiveNode?.isNode).toBe(true)
      expect(material.clearcoat).toBe(1)
      expect(material.iridescence).toBe(0.35)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('evaluates complete neighboring inclusions without shrinking away their original radius', async () => {
    const text = await source()
    expect(text).toContain('loop(27, ({i}) =>')
    expect(text).toContain('cellNoiseVec3(cell.add(offset))')
    expect(text).toContain('const center = rnd.mul(0.55).add(0.22)')
    expect(text).toContain('local.sub(offset.add(center)).length()')
    expect(text).toContain('const filter = footprint.min(0.12)')
    expect(text).toContain('cellDist.smoothstep(filter.negate().add(0.38), filter.add(0.46)).oneMinus()')
    expect(text).toContain('fire.addAssign(harlequinColor.mul(flash).mul(facetMask))')
    expect(text).toContain('viewLattice.mul(Math.PI * 5).add(rnd.x.mul(15.7))')
    expect(text).toContain('braggPhase.cos().smoothstep(0.76, 0.98)')
    expect(0.46 + 0.12).toBeLessThan(1.22)
    expect(text).toContain('p.sub(view.mul(0.038))')
    expect(text).toContain('subSurfaceP.mul(14.5)')
  })
  test('keeps the background continuous and pinfire support inside its own cells', async () => {
    const text = await source()
    expect(text).toContain('const glowTint = mx_noise_float(subSurfaceP.mul(2.5)).mul(0.5).add(0.5)')
    expect(text).toContain("mix(color('#e84118'), color('#00c8ff'), glowTint)")
    expect(text).not.toContain("mix(color('#e84118'), color('#00c8ff'), rnd.z)")
    expect(text).toContain('pinRnd.mul(0.5).add(0.25)')
    expect(text).toContain('pinDist.smoothstep(0.06, pinFoot.add(0.2).min(0.24)).oneMinus()')
    expect(0.24).toBeLessThan(0.25)
    expect(text).toContain('p.sub(view.mul(0.016))')
    expect(text).toContain('pinAngle.mul(Math.PI * 9).add(pinRnd.z.mul(25))')
    expect(text).toContain('pinColor.mul(pinPoint).mul(pinFlash).mul(4.8)')
  })
})
