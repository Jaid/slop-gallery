import {expect, test} from 'bun:test'

import {archivedSoundEffects, enabledSoundEffectIds, enabledSoundEffects, soundEffects} from '../../src/lib/audio/soundEffects.ts'

test('sound effect catalog has 30 stable unique IDs with playable recipes', () => {
  expect(soundEffects).toHaveLength(30)
  expect(soundEffects.map(effect => effect.id)).toEqual(Array.from({length: 30}, (_, index) => `SFX-${String(index + 1).padStart(2, '0')}`))
  expect(new Set(soundEffects.map(effect => effect.label)).size).toBe(30)
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
  expect(enabledSoundEffectIds).toEqual([
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
  expect(enabledSoundEffects.map(effect => effect.label)).toEqual([
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
  expect(enabledSoundEffects).toHaveLength(11)
  expect(archivedSoundEffects).toHaveLength(soundEffects.length - enabledSoundEffects.length)
  expect(new Set([...enabledSoundEffects, ...archivedSoundEffects].map(effect => effect.id))).toEqual(new Set(soundEffects.map(effect => effect.id)))
  expect(archivedSoundEffects.some(effect => enabledSoundEffectIds.includes(effect.id))).toBe(false)
})
