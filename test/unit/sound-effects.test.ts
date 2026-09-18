import {expect, test} from 'bun:test'

import {footstepStyles, footstepVoices, landingVoices, playerSoundEffects} from '../../src/lib/audio/playerSoundEffects.ts'
import {archivedSoundEffects, enabledSoundEffectIds, enabledSoundEffects, soundEffects} from '../../src/lib/audio/soundEffects.ts'

test('sound effect catalog has 38 stable unique IDs with playable recipes', () => {
  expect(soundEffects).toHaveLength(38)
  expect(soundEffects.map(effect => effect.id)).toEqual(Array.from({length: 38}, (_, index) => `SFX-${String(index + 1).padStart(2, '0')}`))
  expect(new Set(soundEffects.map(effect => effect.label)).size).toBe(38)
  for (const effect of soundEffects) {
    expect(effect.voices.length).toBeGreaterThan(0)
    for (const voice of effect.voices) {
      expect(voice.duration).toBeGreaterThan(0)
      expect(voice.volume).toBeGreaterThan(0)
      expect(voice.volume).toBeLessThanOrEqual(0.05)
    }
  }
})
test('preferred sound effects preserve the X-dump audition selection', () => {
  expect(enabledSoundEffectIds.slice(0, 11)).toEqual([
    'SFX-28',
    'SFX-07',
    'SFX-04',
    'SFX-02',
    'SFX-08',
    'SFX-14',
    'SFX-23',
    'SFX-29',
    'SFX-09',
    'SFX-06',
    'SFX-03',
  ])
  expect(enabledSoundEffects.map(effect => effect.id)).toEqual([...enabledSoundEffectIds])
  expect(enabledSoundEffects.slice(0, 11).map(effect => effect.label)).toEqual([
    'Water Drip',
    'Crystal Ping',
    'Soft Confirm',
    'Bubble Pop',
    'Tiny Bell',
    'Sonar Pulse',
    'Kick Knock',
    'Spring Boing',
    'Chime Rise',
    'Coin Spark',
    'Glass Tick',
  ])
})
test('every non-enabled sound is archived automatically', () => {
  expect(enabledSoundEffects).toHaveLength(19)
  expect(archivedSoundEffects).toHaveLength(soundEffects.length - enabledSoundEffects.length)
  expect(new Set([...enabledSoundEffects, ...archivedSoundEffects].map(effect => effect.id))).toEqual(new Set(soundEffects.map(effect => effect.id)))
  expect(archivedSoundEffects.some(effect => enabledSoundEffectIds.includes(effect.id))).toBe(false)
})
test('all eight player cues are enabled and independently auditionable', () => {
  const cues = Object.values(playerSoundEffects)
  expect(cues).toHaveLength(8)
  expect(cues.map(cue => cue.id)).toEqual(enabledSoundEffectIds.slice(11))
  expect(new Set(cues.map(cue => JSON.stringify(cue.voices))).size).toBe(8)
})
test('ten distinct footstep replacements preserve surface, speed, variation and crouch response', () => {
  expect(footstepStyles).toHaveLength(10)
  const styleIds = new Set(footstepStyles.map(style => style.id))
  expect(styleIds.size).toBe(10)
  const recipes = footstepStyles.map(style => footstepVoices(false, 3, {style: style.id}))
  const uniqueRecipes = new Set(recipes.map(recipe => JSON.stringify(recipe)))
  expect(uniqueRecipes.size).toBe(10)
  for (const style of footstepStyles) {
    const walk = footstepVoices(false, 3, {style: style.id})
    const sprint = footstepVoices(false, 9, {style: style.id})
    const sneak = footstepVoices(false, 3, {
      crouching: true,
      style: style.id,
    })
    expect(walk).toHaveLength(3)
    expect(walk.reduce((sum, voice) => sum + voice.volume, 0)).toBeLessThan(sprint.reduce((sum, voice) => sum + voice.volume, 0))
    expect(sneak.reduce((sum, voice) => sum + voice.volume, 0)).toBeLessThan(walk.reduce((sum, voice) => sum + voice.volume, 0))
    expect(footstepVoices(true, 3, {style: style.id})).not.toEqual(walk)
    expect(footstepVoices(false, 3, {
      style: style.id,
      variation: -0.5,
    })).not.toEqual(footstepVoices(false, 3, {
      style: style.id,
      variation: 0.5,
    }))
  }
})
test('second footstep batch is quieter and less bright at walking speed', () => {
  const firstBatch = footstepStyles.slice(0, 5)
  const secondBatch = footstepStyles.slice(5)
  const totalVolume = (style: (typeof footstepStyles)[number]) => footstepVoices(false, 3, {style: style.id}).reduce((sum, voice) => sum + voice.volume, 0)
  const maxNoiseFrequency = (style: (typeof footstepStyles)[number]) => Math.max(...footstepVoices(false, 3, {style: style.id}).filter(voice => voice.kind === 'noise').map(voice => voice.filter.frequency), 0)
  const firstAverageVolume = firstBatch.reduce((sum, style) => sum + totalVolume(style), 0) / firstBatch.length
  const secondAverageVolume = secondBatch.reduce((sum, style) => sum + totalVolume(style), 0) / secondBatch.length
  const firstAverageBrightness = firstBatch.reduce((sum, style) => sum + maxNoiseFrequency(style), 0) / firstBatch.length
  const secondAverageBrightness = secondBatch.reduce((sum, style) => sum + maxNoiseFrequency(style), 0) / secondBatch.length
  expect(secondAverageVolume).toBeLessThan(firstAverageVolume)
  expect(secondAverageBrightness).toBeLessThan(firstAverageBrightness)
})
test('footsteps become stronger, brighter, and shorter as actual speed increases', () => {
  for (const wood of [false, true]) {
    const slow = footstepVoices(wood, 0.9)
    const walk = footstepVoices(wood, 3)
    const sprint = footstepVoices(wood, 9)
    for (const i of [0, 1, 2]) {
      expect(slow[i].volume).toBeLessThan(walk[i].volume)
      expect(walk[i].volume).toBeLessThan(sprint[i].volume)
      expect(slow[i].duration).toBeGreaterThan(sprint[i].duration)
    }
    expect(slow[0].kind === 'oscillator' && slow[0].frequency).toBeLessThan(sprint[0].kind === 'oscillator' ? sprint[0].frequency : 0)
    expect(footstepVoices(wood, 9)).toEqual(footstepVoices(wood, 90))
    expect(footstepVoices(wood, 3, {variation: -0.5})).not.toEqual(footstepVoices(wood, 3, {variation: 0.5}))
  }
  expect(footstepVoices(true, 3)).not.toEqual(footstepVoices(false, 3))
})
test('crouching footsteps are quieter, darker, and softer than normal walking', () => {
  for (const wood of [false, true]) {
    const walk = footstepVoices(wood, 3)
    const sneak = footstepVoices(wood, 3, {crouching: true})
    for (const [index, voice] of sneak.entries()) {
      expect(voice.volume).toBeLessThan(walk[index].volume)
    }
    expect(sneak[0].attack).toBeGreaterThan(walk[0].attack ?? 0)
    const walkNoise = walk.filter(voice => voice.kind === 'noise')
    const sneakNoise = sneak.filter(voice => voice.kind === 'noise')
    expect(walkNoise.some(voice => voice.filter.type === 'highpass')).toBe(false)
    expect(sneakNoise.some(voice => voice.filter.type === 'highpass')).toBe(false)
    expect(Math.max(...sneakNoise.map(voice => voice.filter.frequency))).toBeLessThan(Math.max(...walkNoise.map(voice => voice.filter.frequency)))
    expect(Math.max(...sneakNoise.map(voice => voice.filter.endFrequency ?? voice.filter.frequency))).toBeLessThan(Math.max(...walkNoise.map(voice => voice.filter.endFrequency ?? voice.filter.frequency)))
  }
})
test('landing volume follows impact speed with a bounded heavy-landing ceiling', () => {
  expect(landingVoices(false, 2)[0].volume).toBeLessThan(landingVoices(false, 8)[0].volume)
  expect(landingVoices(false, 10)).toEqual(landingVoices(false, 30))
  expect(landingVoices(false, 5)).not.toEqual(landingVoices(true, 5))
})
