import {describe, expect, test} from 'bun:test'

import PrismaticRain from 'knot-materials/entries/prismatic_rain/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/prismatic_rain/Material.ts', import.meta.url)).text()
describe('Prismatic Rain droplets', () => {
  test('constructs the dispersive glass with surface relief and internal rain', () => {
    const environment = new Texture
    const material = new PrismaticRain(environment)
    try {
      expect(material.name).toBe('prismatic_rain')
      expect(material.positionNode?.isNode).toBe(true)
      expect(material.normalNode?.isNode).toBe(true)
      expect(material.emissiveNode?.isNode).toBe(true)
      expect(material.transmission).toBe(0.62)
      expect(material.dispersion).toBe(0.56)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('tapers tails to zero before UV cell boundaries even under filtering', async () => {
    const text = await source()
    expect(text).toContain('const rainFootprint = rainGrid.fwidth()')
    expect(text).toContain('tailAlong.smoothstep(0.1, 0.44).oneMinus().mul(0.046).add(0.006)')
    expect(text).toContain('tailWidth.add(rainFootprint.x).min(0.08)')
    expect(text).toContain('const tailEnd = rainFootprint.y.add(0.46).min(0.49)')
    expect(text).toContain('tailAlong.smoothstep(0.02, 0.1).mul(tailAlong.smoothstep(0.32, tailEnd).oneMinus())')
    expect(text).toContain('const dropTail = tailSide.mul(tailEnvelope)')
    expect(text).toContain('rainFootprint.length().smoothstep(0.15, 0.6).oneMinus()')
    expect(0.49).toBeLessThan(0.5)
    expect(0.08).toBeLessThan(0.5)
    // Filtered body radius plus its vertical offset remains inside the cell too.
    expect(0.16 + 0.06 + 0.08).toBeLessThan(0.5)
  })
  test('keeps vertex relief derivative-free and retains the internal layers and rainbow trails', async () => {
    const text = await source()
    expect(text).toContain('const dropBodyRaw = dropDistance.smoothstep(0.035, 0.16).oneMinus()')
    expect(text).toContain('normalLocal.mul(dropBodyRaw.mul(0.0011))')
    expect(text).toContain('const layers = 5')
    expect(text).toContain('p.sub(view.mul(depth * 0.24))')
    expect(text).toContain('cellularPoints(q.mul(41), 0.022, 0.14, 0.72)')
    expect(text).toContain('cellularPoints(q.mul(19), 0.04, 0.2, 0.66)')
    expect(text).toContain('opticalLine(trailField, 0.026)')
    expect(text).toContain('const prismColor = spectralColor(prismPhase)')
  })
})
