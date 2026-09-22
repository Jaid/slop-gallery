import {describe, expect, test} from 'bun:test'

const source = (name: string) => Bun.file(new URL(`../../packages/knot-materials/src/entries/horologists_paradox/${name}`, import.meta.url)).text()
describe('Horologist watchwork filtering', () => {
  test('keeps every shape helper local and footprint-driven', async () => {
    const material = await source('Material.ts')
    for (const signature of [
      "function disk(radius: Node<'float'>, size: number, footprint: Node<'float'>)",
      "function annulus(radius: Node<'float'>, inner: number, outer: number, footprint: Node<'float'>)",
      "function watchLine(field: Node<'float'>, width: number, footprint: Node<'float'>)",
      "function watchGear(point: Node<'vec2'>, radius: number, teeth: number, rotation: Node<'float'>, footprint: Node<'float'>)",
      "function watchWave(phase: Node<'float'>, footprint: Node<'float'>)",
    ]) {
      expect(material).toContain(signature)
    }
    expect(material).not.toContain("from './util.ts'")
  })
  test('never differentiates wrapped shapes or discontinuous angular phases', async () => {
    const material = await source('Material.ts')
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
