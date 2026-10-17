import {describe, expect, test} from 'bun:test'

import {knotTubeRadius} from '../../packages/knot-materials/src/candidates/gemini_argon/lib/tubeMetric.ts'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/aventurine_enamel/Material.ts', import.meta.url)).text()
const constant = (text: string, name: string) => {
  const pattern = new RegExp(String.raw`const ${name} = ([\d.]+)`, 'u')
  return Number(pattern.exec(text)![1])
}
describe('Aventurine Enamel', () => {
  test('keeps every aventurine platelet inside its cell for any jittered center', async () => {
    const text = await source()
    const support = constant(text, 'aventurineSupport')
    const [minimum, span] = /const aventurineJitter = \[(?<minimum>[\d.]+), (?<span>[\d.]+)\]/u.exec(text)!.slice(1).map(Number)
    expect(support).toBeLessThan(Math.min(minimum, 1 - minimum - span))
  })
  test('keeps the guilloché foil shallower than a quarter of the tube radius', async () => {
    expect(constant(await source(), 'foilDepth')).toBeLessThan(knotTubeRadius / 4)
  })
})
