import type EffectSprites from '../../src/lib/gallery/fusion/effects/base/EffectSprites.ts'
import type EscapingGhosts from '../../src/lib/gallery/fusion/effects/ghosts/EscapingGhosts.ts'

import {describe, expect, test} from 'bun:test'

import {offsetPosition} from '../../src/lib/gallery/fusion/effects/base/portalOffset.ts'
import {batOffset, flyingBats} from '../../src/lib/gallery/fusion/effects/bats/flights.ts'
import {bloodDrops, gravity as bloodGravity, bloodLanding, drying, splatLift} from '../../src/lib/gallery/fusion/effects/blood/flights.ts'
import {gravity as candyGravity, candyLanding, fading, flungTreats, restingHeight} from '../../src/lib/gallery/fusion/effects/candy/flights.ts'
import {shutting, staring, staringEyes} from '../../src/lib/gallery/fusion/effects/eyes/flights.ts'
import {readFusionEffect} from '../../src/lib/gallery/fusion/effects/forcedEffect.ts'
import {escapingGhosts} from '../../src/lib/gallery/fusion/effects/ghosts/flights.ts'
import {batsEffect, bloodEffect, candyEffect, eyesEffect, fusionEffects, ghostsEffect, lanternsEffect, tendrilsEffect} from '../../src/lib/gallery/fusion/effects/index.ts'
import {poppingLanterns, smoking} from '../../src/lib/gallery/fusion/effects/lanterns/flights.ts'
import {lashingTendrils, snapping, tendrilReach} from '../../src/lib/gallery/fusion/effects/tendrils/flights.ts'
import Fusion from '../../src/lib/gallery/fusion/Fusion.ts'
import FusionRecipe, {itemIngredient, portraitIngredient} from '../../src/lib/gallery/fusion/FusionRecipe.ts'
import {portalFrame} from '../../src/lib/gallery/fusion/portalFrame.ts'
import {fusionTiming} from '../../src/lib/gallery/fusion/timing.ts'
import {halloweenOrb, horrorOrb, promptOrbs, spookOrb, transparentOrb} from '../../src/lib/gallery/orbs/index.ts'

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
      latches: ['charge', 'glass'] as const,
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
      latches: ['charge', 'glass'] as const,
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
  test('every themed orb contributes an effect of its own, which an id names that starts with the orb’s', () => {
    expect(halloweenOrb.effect).toBe(batsEffect)
    expect(horrorOrb.effect).toBe(eyesEffect)
    expect(spookOrb.effect).toBe(ghostsEffect)
    for (const orb of promptOrbs) {
      expect(orb.ingredient(3).contributions).toContainEqual({
        kind: 'effect',
        effect: orb.effect,
      })
    }
    const ids = fusionEffects.map(effect => effect.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
    for (const id of ids) {
      expect(promptOrbs.some(orb => id.startsWith(`${orb.id}-`))).toBe(true)
    }
  })
  test('?fusion_effect names an effect every portal shows instead', () => {
    for (const {id} of fusionEffects) {
      expect(readFusionEffect(`https://example.com/?fusion_effect=${id}`)).toBe(id)
    }
    expect(readFusionEffect('https://example.com/?fusion_effect=pumpkin-spice')).toBe('')
    expect(readFusionEffect('https://example.com/')).toBe('')
  })
  test('every effect’s sprites stand at the portal’s middle, know the floor and show nothing until the result flipped out', () => {
    for (const effect of fusionEffects) {
      const fusion = new Fusion({
        work,
        partner: {
          kind: 'item',
          id: 'prop-orb-halloween',
          consumed: true,
        },
        images: ['/hung.jxl'],
        latches: ['charge', 'glass'] as const,
        effects: [effect],
      }, {frame})
      expect(fusion.afterglow).toBe(effect.afterglow)
      const show = effect.show(fusion)
      const sprites = show.root.children[0] as EffectSprites
      expect(sprites.count).toBeGreaterThan(0)
      expect(sprites.frustumCulled).toBe(false)
      expect(sprites.position.toArray()).toEqual(frame.center)
      expect(sprites.uniforms.floor.value).toBeCloseTo(frame.floor - frame.center[1], 9)
      expect(sprites.uniforms.normal.value.toArray()).toEqual(frame.normal)
      expect(sprites.uniforms.tangent.value.toArray()).toEqual(frame.tangent)
      show.update(5)
      expect(sprites.uniforms.clock.value).toBe(-1)
      fusion.emergedAt = 6
      show.update(6.25)
      expect(sprites.uniforms.clock.value).toBeCloseTo(0.25, 9)
      show.dispose()
      fusion.abort()
    }
  })
  test('every effect keeps the portal open until the last of it is gone, and all of them longer than its own afterglow', () => {
    for (const effect of fusionEffects) {
      expect(effect.afterglow).toBeGreaterThan(fusionTiming.afterglow)
    }
    expect(batsEffect.afterglow).toBe(Math.max(...flyingBats.map(({delay, life}) => delay + life)))
    expect(candyEffect.afterglow).toBeCloseTo(fading.start + fading.stagger + fading.duration, 9)
    expect(lanternsEffect.afterglow).toBe(Math.max(...poppingLanterns.map(({blowOut}) => blowOut)) + smoking)
    expect(bloodEffect.afterglow).toBeCloseTo(drying.start + drying.stagger + drying.duration, 9)
    expect(eyesEffect.afterglow).toBeCloseTo(Math.max(...staringEyes.map(({close}) => close)) + shutting.lids + shutting.fading, 9)
    expect(tendrilsEffect.afterglow).toBe(Math.max(...lashingTendrils.map(({retract}) => retract)) + snapping)
  })
  test('the bats burst out of the portal’s middle and fly out into the room', () => {
    for (const bat of flyingBats) {
      for (const [axis, value] of batOffset(bat, 0).entries()) {
        expect(value).toBeCloseTo([0, 0, 0.05][axis], 9)
      }
      const [, , out] = batOffset(bat, bat.life)
      expect(out).toBeGreaterThan(0.3)
    }
  })
  test('candies and drops land on the floor when their landing says so, and before they fade or dry away', () => {
    const floor = frame.floor - frame.center[1]
    for (const treat of flungTreats) {
      if (treat.kind === 'confetti') {
        continue
      }
      const {hop, landing} = candyLanding(treat, floor)
      const up = treat.velocity[1]
      expect(up * landing - candyGravity * landing * landing / 2).toBeCloseTo(floor + restingHeight(treat), 6)
      expect(hop).toBeGreaterThan(0)
      expect(treat.delay + landing + hop).toBeLessThan(fading.start)
    }
    for (const drop of bloodDrops) {
      const {landing, speed} = bloodLanding(drop, floor)
      const up = drop.velocity[1]
      expect(drop.start[1] + up * landing - bloodGravity * landing * landing / 2).toBeCloseTo(floor + splatLift, 6)
      expect(speed).toBeGreaterThan(0)
      expect(drop.delay + landing).toBeLessThan(drying.start)
    }
  })
  test('the eyes open before they stare and shut after it, and the lanterns pop out before they are blown out', () => {
    for (const {close, open} of staringEyes) {
      expect(open).toBeLessThan(staring)
      expect(close).toBeGreaterThan(staring + 0.5)
    }
    for (const {blowOut, delay, wink} of poppingLanterns) {
      expect(delay).toBeLessThan(blowOut - 1)
      if (!(wink !== undefined)) {
        continue
      }
      expect(wink).toBeGreaterThan(delay + 0.5)
      expect(wink).toBeLessThan(blowOut - 0.3)
    }
    for (const tendril of lashingTendrils) {
      const reach = tendrilReach(tendril)
      expect(Math.hypot(...reach)).toBeCloseTo(tendril.length, 9)
      expect(reach[2]).toBeGreaterThan(0)
      expect(offsetPosition(frame, reach)[2]).toBeGreaterThan(frame.center[2])
    }
  })
})
