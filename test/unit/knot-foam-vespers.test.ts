import {describe, expect, test} from 'bun:test'

import FoamVespers from 'knot-materials/entries/foam_vespers/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/foam_vespers/Material.ts', import.meta.url)).text()
describe('Foam Vespers bubbles', () => {
  test('constructs displaced soap films', () => {
    const environment = new Texture
    const material = new FoamVespers(environment)
    try {
      expect(material.name).toBe('foam_vespers')
      expect(material.positionNode?.isNode).toBe(true)
      expect(material.normalNode?.isNode).toBe(true)
      expect(material.emissiveNode?.isNode).toBe(true)
      expect(material.roughnessNode?.isNode).toBe(true)
      expect(material.ior).toBe(1.33)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('uses matching complete neighborhood searches for distances and identities', async () => {
    const text = await source()
    expect(text).toContain('mx_worley_noise_vec3(position, jitter, 0)')
    expect(text).toContain('mx_worley_noise_float(position, jitter, 1)')
    expect(text).toContain('wall: distances.y.sub(distances.x)')
    expect(text).not.toContain('Loop(8')
    expect(text).toContain('const footprint = foamPosition.fwidth().length()')
    expect(text).not.toContain('const footprint = first.fwidth()')
  })
  test('joins displaced domes and random film properties continuously at bubble walls', async () => {
    const text = await source()
    expect(text).toContain('dome.mul(wall.smoothstep(0, 0.12)).mul(reliefAmplitude)')
    expect(text).toContain('const interior = wall.smoothstep(0, footprint.add(0.12))')
    expect(text).toContain('const crown = mix(float(1),')
    expect(text).toContain('const thickness = mix(float(0.78),')
    expect(text).toContain('smoothstep(0.02, footprint.mul(foamScale).add(0.34)).oneMinus()')
    expect(text).not.toContain('smoothstep(0.34, 0.02)')
  })
})
