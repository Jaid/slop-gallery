import {describe, expect, test} from 'bun:test'

import {pickFrame} from '../../src/lib/frames/frameChoice.ts'
import FusionRecipe, {maximumIngredients, mergeInstruction} from '../../src/lib/gallery/fusion/FusionRecipe.ts'
import {promptOrbs, transparentOrb} from '../../src/lib/gallery/orbs/index.ts'

const png = Uint8Array.fromBase64('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACAQMAAABIeJ9nAAAAA1BMVEX/AAAZ4gk3AAAADElEQVQI12NgYGAAAAAEAAEnNCcKAAAAAElFTkSuQmCC')
const work = {
  title: 'The hung work',
  image: new Blob([png], {type: 'image/png'}),
}
describe('fusion recipe', () => {
  test('takes the hung work and 1 to 3 more ingredients', () => {
    expect(maximumIngredients).toBe(4)
    expect(() => new FusionRecipe(work, [])).toThrow(RangeError)
    for (const count of [1, 2, 3]) {
      const recipe = new FusionRecipe(work, Array.from({length: count}, (_, index) => ({title: `item ${index}`})))
      expect(recipe.ingredients).toHaveLength(count + 1)
      expect(recipe.ingredients[0]).toBe(work)
    }
    expect(() => new FusionRecipe(work, Array.from({length: 4}, () => ({title: 'item'})))).toThrow(RangeError)
  })
  test('leaves the work unchanged when nothing but the work registered anything, like with the Transparent Orb', () => {
    expect(transparentOrb.ingredient(1)).toEqual({})
    const clear = new FusionRecipe(work, [
      {
        title: transparentOrb.title,
        ...transparentOrb.ingredient(1),
      },
    ])
    expect(clear.unchanged).toBe(true)
    expect(clear.looks).toEqual([work.image])
    expect(clear.color).toBeUndefined()
    expect(clear.frame).toBeUndefined()
    // Neither a look nor a glow nor a frame is anything to merge the work with.
    const dressed = new FusionRecipe(work, [
      {
        title: 'glow',
        color: '#ff0000',
        frame: 'classic',
        look: '/look.jxl',
      },
    ])
    expect(dressed.unchanged).toBe(true)
    const prompted = new FusionRecipe(work, [
      {
        title: 'prompt',
        instruction: 'Make it blue.',
      },
    ])
    expect(prompted.unchanged).toBe(false)
    const photographed = new FusionRecipe(work, [
      {
        title: 'photograph',
        image: Promise.resolve(work.image),
      },
    ])
    expect(photographed.unchanged).toBe(false)
  })
  test('asks to merge several images, followed by every instruction in the order of its ingredient, and sends a lone image’s instruction verbatim', () => {
    const merge = new FusionRecipe(work, [
      {
        title: 'second',
        image: '/second.jxl',
      },
      {
        title: 'first prompt',
        instruction: 'Make it blue.',
      },
      {
        title: 'second prompt',
        instruction: 'Make it loud.',
      },
    ])
    expect(merge.text(2)).toBe(`${mergeInstruction}\n\nMake it blue.\n\nMake it loud.`)
    expect(merge.handmade).toBe('collage')
    const rework = new FusionRecipe(work, [
      {
        title: 'prompt',
        instruction: 'Make it blue.',
      },
    ])
    expect(rework.text(1)).toBe('Make it blue.')
    expect(rework.handmade).toBe('tint')
  })
  test('sends every image in the order of its ingredient, waiting for those still in the making, and nothing of the looks', async () => {
    const photograph = Promise.withResolvers<Blob>()
    const recipe = new FusionRecipe(work, [
      {
        title: 'photographed',
        image: photograph.promise,
      },
      {
        title: 'orb',
        instruction: 'Make it blue.',
        look: '/orb.jxl',
      },
    ])
    expect(recipe.looks).toEqual([work.image, '/orb.jxl'])
    expect(recipe.pendingLooks).toEqual([photograph.promise])
    const content = recipe.content()
    photograph.resolve(new Blob([png], {type: 'image/png'}))
    const {images, text} = await content
    expect(images).toEqual([png, png])
    expect(text).toBe(`${mergeInstruction}\n\nMake it blue.`)
  })
  test('takes the glow and the frame of the first ingredient bringing one, and tints by hand only for glows standing in for an instruction', () => {
    const recipe = new FusionRecipe(work, [
      {
        title: 'plain glow',
        color: '#00ff00',
      },
      {
        title: 'Test Orb',
        color: '#ff0000',
        frame: 'lodge-tramp',
        instruction: 'Make it red.',
      },
      {
        title: 'frame',
        frame: 'cell-coffer',
      },
    ])
    expect(recipe.color).toBe('#00ff00')
    expect(recipe.frame).toBe('lodge-tramp')
    expect(recipe.tints.map(tint => tint.title)).toEqual(['Test Orb'])
    expect(recipe.localDescription).toBe('Tinted by hand in the Test Orb’s glow.')
  })
  for (const orb of promptOrbs) {
    test(`the ${orb.title} registers its prompt, glow, photograph and frame of the game`, () => {
      expect(orb.ingredient(7)).toEqual({
        color: orb.color,
        frame: pickFrame(7, orb.frame),
        instruction: orb.prompt(7),
        look: orb.photo,
      })
    })
  }
})
