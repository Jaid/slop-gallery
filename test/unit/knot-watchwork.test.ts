import {describe, expect, test} from 'bun:test'

import {annulus, disk, watchGear, watchLine, watchWave} from 'knot-materials/entries/horologists_paradox/util.ts'
import {float, vec2} from 'three/tsl'

const source = (name: string) => Bun.file(new URL(`../../packages/knot-materials/src/entries/horologists_paradox/${name}`, import.meta.url)).text()
describe('Horologist watchwork filtering', () => {
  test('constructs every shape with an explicit continuous footprint', () => {
    const footprint = float(0.001)
    expect(disk(float(0.2), 0.437, footprint).isNode).toBe(true)
    expect(annulus(float(0.2), 0.416, 0.472, footprint).isNode).toBe(true)
    expect(watchLine(float(0.2), 0.026, footprint).isNode).toBe(true)
    expect(watchWave(float(0.2), footprint).isNode).toBe(true)
    expect(watchGear(vec2(0.1), 0.265, 18, float(0), footprint).mask.isNode).toBe(true)
  })
  test('never differentiates wrapped shapes or discontinuous angular phases', async () => {
    const material = await source('Material.ts')
    const helpers = await source('util.ts')
    expect(helpers).not.toContain('.fwidth()')
    expect(material).toContain('const surfaceFootprint = q.fwidth().length().max(0.00001)')
    for (const depth of ['0.032', '0.017', '0.009']) {
      expect(material).toContain(`q.sub(ray.mul(${depth})).fwidth().length().max(0.00001)`)
    }
    expect(material).not.toContain('springPhase.fwidth()')
    expect(material).toContain('backFootprint.mul(float(TAU * 17).add(springRadius.max(0.065).reciprocal()))')
    expect(material).toContain('watchWave(big.r.mul(360), bigFootprint.mul(360))')
    expect(material).toContain('watchWave(small.r.mul(430), smallFootprint.mul(430))')
  })
  test('keeps filtered surface relief strictly inside the tile even when minified', async () => {
    const material = await source('Material.ts')
    expect(material).toContain('const surfaceFilter = surfaceFootprint.min(0.025)')
    expect(material).toContain('annulus(surfaceRadius, 0.416, 0.472, surfaceFilter)')
    expect(material).toContain('disk(surfaceRadius, 0.437, surfaceFilter)')
    expect(material).toContain('disk(surfaceRadius, 0.447, surfaceFilter)')
    expect(material).toContain('disk(screwA.length(), 0.042, surfaceFilter)')
    expect(material).toContain('disk(screwB.length(), 0.042, surfaceFilter)')
    expect(0.472 + 0.025).toBeLessThan(0.5)
    expect(0.32 + 0.042 + 0.025).toBeLessThan(0.5)
  })
  test('preserves the module layout, parallax depths, moving gears and nonemissive finish', async () => {
    const material = await source('Material.ts')
    expect(material).toContain('const modules = vec2(24, 3)')
    expect(material).toContain('const local = q.fract().sub(0.5)')
    expect(material).toContain('local.sub(ray.mul(0.032))')
    expect(material).toContain('local.sub(ray.mul(0.017))')
    expect(material).toContain('local.sub(ray.mul(0.009))')
    expect(material).toContain('time.mul(1.15)')
    expect(material).toContain('time.mul(0.13)')
    expect(material).toContain('time.mul(-0.234)')
    expect(material).toContain('watchGear(bigPoint, 0.265, 18, bigRotation, bigFootprint)')
    expect(material).toContain('watchGear(smallPoint, 0.145, 10, smallRotation, smallFootprint)')
    expect(material).toContain('negateOnBackSide(bumpNormal(relief))')
    expect(material).toContain('this.clearcoatNormalNode = normalViewGeometry')
    expect(material).not.toContain('emissiveNode')
  })
})
