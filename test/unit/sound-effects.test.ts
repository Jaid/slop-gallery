import {expect, test} from 'bun:test'

import {footstepVoices, impactFootstepStrength, playerSoundEffects} from '../../src/lib/audio/playerSoundEffects.ts'
import {archivedSoundEffects, enabledSoundEffectIds, enabledSoundEffects, soundEffects} from '../../src/lib/audio/soundEffects.ts'

test('sound effect catalog has 37 stable unique IDs with playable recipes', () => {
  expect(soundEffects).toHaveLength(37)
  expect(soundEffects.map(effect => effect.id)).toEqual(Array.from({length: 37}, (_, index) => `SFX-${String(index + 1).padStart(2, '0')}`))
  expect(new Set(soundEffects.map(effect => effect.label)).size).toBe(37)
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
  expect(enabledSoundEffects).toHaveLength(18)
  expect(archivedSoundEffects).toHaveLength(soundEffects.length - enabledSoundEffects.length)
  expect(new Set([...enabledSoundEffects, ...archivedSoundEffects].map(effect => effect.id))).toEqual(new Set(soundEffects.map(effect => effect.id)))
  expect(archivedSoundEffects.some(effect => enabledSoundEffectIds.includes(effect.id))).toBe(false)
})
test('all seven player cues are enabled and independently auditionable', () => {
  const cues = Object.values(playerSoundEffects)
  expect(cues).toHaveLength(7)
  expect(cues.map(cue => cue.id)).toEqual(enabledSoundEffectIds.slice(11))
  expect(new Set(cues.map(cue => JSON.stringify(cue.voices))).size).toBe(7)
})
test('Soft Weight keeps a restrained three-layer recipe', () => {
  const walk = footstepVoices('generic', 3)
  expect(walk).toHaveLength(3)
  expect(walk.filter(voice => voice.kind === 'noise')).toHaveLength(1)
  const noiseVoice = walk.find(voice => voice.kind === 'noise')
  expect(noiseVoice?.filter.type).toBe('lowpass')
  expect(noiseVoice?.filter.frequency).toBeLessThan(400)
  expect(walk.reduce((sum, voice) => sum + voice.volume, 0)).toBeLessThan(0.01)
})
test('surface modifiers keep one Soft Weight family while changing material character', () => {
  const generic = footstepVoices('generic', 3)
  const hollow = footstepVoices('hollow', 3)
  const glass = footstepVoices('glass', 3)
  const fabric = footstepVoices('fabric', 3)
  expect(new Set([generic, hollow, glass, fabric].map(recipe => JSON.stringify(recipe))).size).toBe(4)
  expect(hollow[0].kind === 'oscillator' && hollow[0].frequency).toBeLessThan(generic[0].kind === 'oscillator' ? generic[0].frequency : 0)
  expect(glass[0].kind === 'oscillator' && glass[0].frequency).toBeGreaterThan(generic[0].kind === 'oscillator' ? generic[0].frequency : Infinity)
  expect(fabric.reduce((sum, voice) => sum + voice.volume, 0)).toBeLessThan(generic.reduce((sum, voice) => sum + voice.volume, 0))
  const fabricNoise = fabric.find(voice => voice.kind === 'noise')
  const genericNoise = generic.find(voice => voice.kind === 'noise')
  expect(fabricNoise?.filter.frequency).toBeLessThan(genericNoise?.filter.frequency ?? 0)
})
test('footsteps become stronger, brighter, and shorter as actual speed increases', () => {
  for (const surface of ['generic', 'hollow', 'glass', 'fabric'] as const) {
    const slow = footstepVoices(surface, 0.9)
    const walk = footstepVoices(surface, 3)
    const sprint = footstepVoices(surface, 9)
    for (const i of [0, 1, 2]) {
      expect(slow[i].volume).toBeLessThan(walk[i].volume)
      expect(walk[i].volume).toBeLessThan(sprint[i].volume)
      expect(slow[i].duration).toBeGreaterThan(sprint[i].duration)
    }
    expect(slow[0].kind === 'oscillator' && slow[0].frequency).toBeLessThan(sprint[0].kind === 'oscillator' ? sprint[0].frequency : 0)
    expect(footstepVoices(surface, 9)).toEqual(footstepVoices(surface, 90))
    expect(footstepVoices(surface, 3, {variation: -0.5})).not.toEqual(footstepVoices(surface, 3, {variation: 0.5}))
  }
  expect(footstepVoices('hollow', 3)).not.toEqual(footstepVoices('generic', 3))
})
test('crouching footsteps are quieter, darker, and softer than normal walking', () => {
  for (const surface of ['generic', 'hollow', 'glass', 'fabric'] as const) {
    const walk = footstepVoices(surface, 3)
    const sneak = footstepVoices(surface, 3, {crouching: true})
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
test('landing strength reuses Soft Weight and scales with pre-impact fall speed', () => {
  const normal = footstepVoices('generic', 3)
  const light = footstepVoices('generic', 3, {strength: impactFootstepStrength(2)})
  const heavy = footstepVoices('generic', 3, {strength: impactFootstepStrength(10)})
  expect(impactFootstepStrength(2)).toBeLessThan(impactFootstepStrength(5))
  expect(impactFootstepStrength(5)).toBeLessThan(impactFootstepStrength(10))
  expect(impactFootstepStrength(10)).toBeGreaterThan(8)
  expect(impactFootstepStrength(12)).toBe(12)
  expect(impactFootstepStrength(12)).toBe(impactFootstepStrength(30))
  for (const index of [0, 1, 2]) {
    expect(light[index].volume).toBeGreaterThan(normal[index].volume)
    expect(heavy[index].volume).toBeGreaterThan(light[index].volume)
    expect(heavy[index].duration).toBe(normal[index].duration)
  }
})
