import {describe, expect, test} from 'bun:test'

import OpalPyre from 'knot-materials/entries/opal_pyre/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/opal_pyre/Material.ts', import.meta.url)).text()
describe('Opal Pyre fire fields', () => {
  test('constructs the translucent, iridescent opal', () => {
    const environment = new Texture
    const material = new OpalPyre(environment)
    try {
      expect(material.name).toBe('opal_pyre')
      expect(material.colorNode?.isNode).toBe(true)
      expect(material.emissiveNode?.isNode).toBe(true)
      expect(material.iridescenceThicknessNode?.isNode).toBe(true)
      expect(material.transmission).toBe(0.2)
      expect(material.ior).toBe(1.46)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('uses continuous bounded fields for fire coverage, phase and film thickness', async () => {
    const text = await source()
    expect(text).not.toContain('.fract()')
    expect(text).not.toContain('localPatch')
    expect(text).toContain('mx_fractal_noise_float(p.mul(3), 3, 2, 0.5).mul(0.5).add(0.5).clamp()')
    expect(text).toContain('const patchMask = patchRnd.smoothstep(0.35, 0.65)')
    expect(text).toContain('const patchSeed = patchRnd.mul(12)')
    expect(text).toContain('viewDir.dot(p.sub(vec3(0.5))).mul(8).add(time.mul(0.4)).add(patchSeed)')
    expect(text).toContain('mix(280, 720, patchRnd)')
  })
  test('uses geometric facing and lets high-noise dendrites darken the host and fire together', async () => {
    const text = await source()
    expect(text).toContain('const {p, view: viewDir, facing, grazing, near, intimate} = viewerFrame()')
    expect(text).not.toContain('positionView.dot(')
    expect(text).not.toContain('vec2(')
    expect(text).not.toContain('as unknown as')
    expect(text).toContain('mx_fractal_noise_float(p.mul(3.6).add(vec3(2.3, 5.1, 0)), 4, 2.1, 0.55)')
    const dendrite = text.slice(text.indexOf('const dendrite ='), text.indexOf('// ---- play-of-colour'))
    expect(dendrite).toContain('.smoothstep(0.42, 0.52)')
    expect(dendrite).not.toContain('.oneMinus()')
    expect(text).toContain("this.colorNode = mix(hostWithVeins, color('#020210'), dendrite)")
    expect(text).toContain('innerGlow.add(haloGlow).mul(dendrite.oneMinus())')
  })
})
