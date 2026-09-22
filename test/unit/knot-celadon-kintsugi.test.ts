import {describe, expect, test} from 'bun:test'

import CeladonKintsugiMaterial from 'knot-materials/entries/celadon_kintsugi/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/celadon_kintsugi/Material.ts', import.meta.url)).text()
describe('Celadon Kintsugi fractures', () => {
  test('constructs the recessed porcelain and gold material', () => {
    const environment = new Texture
    const material = new CeladonKintsugiMaterial(environment)
    try {
      expect(material.name).toBe('celadon_kintsugi')
      for (const node of [material.positionNode, material.normalNode, material.colorNode, material.metalnessNode]) {
        expect(node?.isNode).toBe(true)
      }
      expect(material.clearcoatNormalNode).toBe(material.normalNode)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('places neighboring features in the same coordinate frame as the query', async () => {
    const text = await source()
    expect(text).toContain('hash3(cell.add(vec3(x, y, z)))')
    expect(text).toContain('vec3(x, y, z).add(feature).sub(local).length()')
    expect(text).not.toContain('local.add(vec3(x, y, z))')
    expect(text).toContain('second = second.min(distance.max(first))')
    expect(text).toContain('return second.sub(first)')
  })
  test('filters surface, depth and crazing masks without adding derivatives to displacement', async () => {
    const text = await source()
    expect(text).toContain('const filteredWidth = field.fwidth().add(width)')
    expect(text).toContain('field.abs().smoothstep(0, filteredWidth).oneMinus().mul(float(width).div(filteredWidth))')
    expect(text).toContain('const crack = seamCoverage(surface, width)')
    expect(text).toContain("let gold: Node<'float'> = crack")
    expect(text).toContain('gold.mul(seamCoverage(crackField(base.sub(view.mul(t / scale)), scale), width))')
    expect(text).toContain('const hairline = seamCoverage(crazing, 0.05).mul(near)')
    expect(text).toContain('const displacementCrack = surface.smoothstep(0, width).oneMinus()')
    expect(text).toContain('const displacementHairline = crazing.abs().smoothstep(0, 0.05).oneMinus().mul(near)')
    expect(text).toContain('const displacement = displacementCrack.mul(0.006).add(displacementHairline.mul(0.0006))')
    expect(text).toContain('this.positionNode = p.sub(normalLocal.mul(displacement))')
    expect(text).toContain('const relief = crack.mul(0.006).add(hairline.mul(0.0006)).negate()')
    expect(text).toContain('proceduralNormal(relief, 1.8)')
  })
})
