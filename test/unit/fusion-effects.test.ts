import type EscapingGhosts from '../../src/lib/gallery/fusion/effects/ghosts/EscapingGhosts.ts'

import {describe, expect, test} from 'bun:test'

import {escapingGhosts} from '../../src/lib/gallery/fusion/effects/ghosts/flights.ts'
import {ghostsEffect} from '../../src/lib/gallery/fusion/effects/index.ts'
import Fusion from '../../src/lib/gallery/fusion/Fusion.ts'
import FusionRecipe, {itemIngredient, portraitIngredient} from '../../src/lib/gallery/fusion/FusionRecipe.ts'
import {portalFrame} from '../../src/lib/gallery/fusion/portalFrame.ts'
import {fusionTiming} from '../../src/lib/gallery/fusion/timing.ts'
import {spookOrb, transparentOrb} from '../../src/lib/gallery/orbs/index.ts'

const hung = portraitIngredient({
  title: 'The hung portrait',
  source: '/hung.jxl',
})
const work = {
  id: 'work',
  position: [0, 1.7, 0] as [number, number, number],
  rotation: 0,
  width: 1,
  height: 1,
}
const frame = portalFrame(work, {
  floor: 0,
  room: 4,
  sides: [3, 3],
})
describe('fusion effects', () => {
  test('the Spook Orb contributes its ghosts, which the recipe hands the portal once', () => {
    expect(spookOrb.ingredient(3).contributions).toContainEqual({
      kind: 'effect',
      effect: ghostsEffect,
    })
    expect(transparentOrb.ingredient(3).contributions.some(contribution => contribution.kind === 'effect')).toBe(false)
    const recipe = new FusionRecipe([hung, itemIngredient(spookOrb.title, spookOrb.ingredient(3)), itemIngredient('Second Spook Orb', spookOrb.ingredient(4))])
    expect(recipe.effects).toEqual([ghostsEffect])
    const clear = new FusionRecipe([hung, itemIngredient(transparentOrb.title, transparentOrb.ingredient(3))])
    expect(clear.effects).toEqual([])
  })
  test('an effect gives an image model nothing to do', () => {
    const recipe = new FusionRecipe([
      hung,
      itemIngredient('Ghost Jar', {
        contributions: [
          {
            kind: 'effect',
            effect: ghostsEffect,
          },
        ],
      }),
    ])
    expect(recipe.unchanged).toBe(true)
    expect(recipe.effects).toEqual([ghostsEffect])
  })
  test('the ghosts keep the portal open until the last of them has faded away, longer than its own afterglow', () => {
    for (const {delay, life} of escapingGhosts) {
      expect(delay + life).toBeLessThanOrEqual(ghostsEffect.afterglow)
    }
    expect(ghostsEffect.afterglow).toBeGreaterThan(fusionTiming.afterglow)
    const fusion = new Fusion({
      work,
      partner: {
        kind: 'item',
        id: 'prop-orb-spook',
        consumed: true,
      },
      images: ['/hung.jxl'],
      effects: [ghostsEffect],
    }, {frame})
    expect(fusion.afterglow).toBe(ghostsEffect.afterglow)
    fusion.abort()
  })
  test('the ghosts only escape once the result flipped out, and stay silent without sound', () => {
    const fusion = new Fusion({
      work,
      partner: {
        kind: 'item',
        id: 'prop-orb-spook',
        consumed: true,
      },
      images: ['/hung.jxl'],
      effects: [ghostsEffect],
    }, {frame})
    const show = ghostsEffect.show(fusion)
    const mesh = show.root.children[0] as EscapingGhosts
    expect(mesh.count).toBe(escapingGhosts.length)
    expect(mesh.position.toArray()).toEqual(frame.center)
    show.update(5)
    expect(mesh.uniforms.clock.value).toBeLessThan(0)
    fusion.emergedAt = 6
    show.update(5.9)
    expect(mesh.uniforms.clock.value).toBeLessThan(0)
    show.update(7.5)
    expect(mesh.uniforms.clock.value).toBeCloseTo(1.5, 9)
    show.dispose()
    fusion.abort()
  })
})
