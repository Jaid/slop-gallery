import {describe, expect, test} from 'bun:test'

import fs from 'fs-extra'
import {vec3} from 'three/tsl'

import {cellularBoundary, cellularPoints} from '../../src/lib/knots/cellularField.ts'

const source = (file: string) => fs.readFile(new URL(`../../src/lib/knots/${file}`, import.meta.url), 'utf8')
const finish = async (file: string, id: string) => {
  const text = await source(file)
  const start = text.indexOf(`case '${id}':`)
  expect(start).toBeGreaterThan(-1)
  return text.slice(start, text.indexOf('\n        break', start))
}
describe('Knot cellular fields', () => {
  test('constructs real distance fields and rejects support that could reach another feature', () => {
    expect(cellularBoundary(vec3(0)).isNode).toBe(true)
    expect(cellularPoints(vec3(0)).isNode).toBe(true)
    expect(cellularPoints(vec3(0), 0, 0.24, 0.9).isNode).toBe(true)
    for (const [inner, outer, threshold] of [[-1, 0.2, 0.5], [0.2, 0.2, 0.5], [0.1, 0.25, 0.5], [0.1, 0.2, 1], [0.1, 0.2, -1], [0.1, Number.NaN, 0.5]]) {
      expect(() => cellularPoints(vec3(0), inner, outer, threshold)).toThrow(RangeError)
    }
  })
  test('keeps feature identity out of the point distance and bounds its support before gating', async () => {
    const text = await source('cellularField.ts')
    expect(text).toContain('cellNoiseVec3(cell).mul(0.5).add(0.25)')
    expect(text).toContain('position.fract().sub(center).length()')
    expect(text).toContain('mx_cell_noise_float(cell)')
    expect(text).toContain('distance.smoothstep(inner, outer).oneMinus()')
    expect(text).toContain('distances.y.sub(distances.x)')
  })
  test('uses localized inclusions instead of whole-cell point masks', async () => {
    const cases: Array<[string, string]> = [
      ['gemini/batch2Material.ts', 'celestial_astrolabe'],
      ['gemini/batch3Material.ts', 'photonic_morpho'],
      ['gemini/batch3Material.ts', 'opaline_aerogel'],
      ['gemini/batch3Material.ts', 'radiometric_guilloche'],
      ['grok/buildMaterial.ts', 'birefringent_glacier'],
      ['grok/buildMaterial.ts', 'mycelium_choir'],
      ['grok/webChatMaterial.ts', 'gossamer_dew'],
      ['grok/webChatMaterial.ts', 'ion_wake'],
      ['deepseek/webChatMaterial.ts', 'abyssal_cathedral'],
      ['kimi/webChatMaterial.ts', 'harlequin_opal'],
      ['qwen/webChatMaterial.ts', 'eventide_silk'],
      ['muse/webChatMaterial.ts', 'nocturne_opal'],
    ]
    for (const [file, id] of cases) {
      const text = await finish(file, id)
      expect(text, id).toContain('cellularPoints(')
      expect(text, id).not.toContain('mx_cell_noise_float(')
    }
  })
  test('retains stochastic alpha scintillation without moving cell-shaped patches', async () => {
    const text = await finish('gemini/batch3Material.ts', 'radiometric_guilloche')
    expect(text).toContain('const tick = time.mul(28).floor()')
    expect(text).toContain('cellularPoints(p.mul(85).add(vec3(0, 0, tick)), 0.025, 0.16, 0.7)')
    expect(text).toContain("const radiumPhosphor = color('#55ff77')")
    expect(text).toContain('proceduralNormal(rosette.mul(0.25), 0.004)')
  })
  test('uses continuous solar granulation and genuine Voronoi fractures', async () => {
    for (const id of ['cryogenic_kintsugi', 'chromospheric_spicule']) {
      const text = await finish('gemini/batch3Material.ts', id)
      expect(text).toContain('cellularBoundary(')
      expect(text).not.toContain('cellNoiseVec3(')
    }
    for (const [file, id] of [['deepseek/webChatMaterial.ts', 'solar_prominence'], ['glm/webChatMaterial.ts', 'caged_star']]) {
      const text = await finish(file, id)
      expect(text).toContain('mx_worley_noise_float(')
      expect(text).not.toContain('cellNoiseVec3(')
    }
    expect(await finish('glm/webChatMaterial.ts', 'caged_star')).toContain('mx_cell_noise_float(vec3(flareTick')
  })
  test('keeps skin and nacre backgrounds continuous without removing contained papillae', async () => {
    const skin = await finish('sol/additionalBatchMaterial.ts', 'chromatophore_skin')
    expect(skin).toContain('const rnd = cellNoiseVec3(q)')
    expect(skin).toContain('this.positionNode = p.add(normalLocal.mul(papillaHeight))')
    expect(skin).toContain('mx_noise_float(p.mul(24))')
    expect(skin).toContain('this.iridescenceThicknessNode = structuralNoise')
    expect(skin).toContain('.min(0.235)')
    expect(skin).toContain('.min(0.245)')
    const nacre = await finish('grok/buildMaterial.ts', 'abyssal_nacre')
    expect(nacre).not.toContain('cellNoiseVec3(')
    expect(nacre).not.toContain('mx_cell_noise_float(')
  })
  test('prevents filtering and secondary tint seeds from revealing feature ownership', async () => {
    const opal = await finish('kimi/webChatMaterial.ts', 'harlequin_opal')
    expect(opal).toContain('mx_worley_noise_float(cellP, 0.2, 1)')
    expect(opal).toContain('.min(0.39)')
    expect(opal).not.toContain('cellP.fract()')
    expect(opal).not.toContain('spectralColor(id.z.mul(9)')
    const stone = await finish('deepseek/webChatMaterial.ts', 'abyssal_cathedral')
    expect(stone).toContain('q.floor().add(vec3(23, 92, 47))')
    expect(stone).toContain('fp.add(0.22).min(0.24)')
  })
})
