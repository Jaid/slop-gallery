import {expect, test} from 'bun:test'

import {selectedSoundEffectIds, selectedSoundEffects, temporarySoundEffects} from '../../src/lib/audio/temporarySoundEffects.ts'

test('temporary sound audition set has 30 stable unique IDs with playable recipes', () => {
  expect(temporarySoundEffects).toHaveLength(30)
  expect(temporarySoundEffects.map(effect => effect.id)).toEqual(Array.from({length: 30}, (_, index) => `SFX-${String(index + 1).padStart(2, '0')}`))
  expect(new Set(temporarySoundEffects.map(effect => effect.label)).size).toBe(30)
  for (const effect of temporarySoundEffects) {
    expect(effect.voices.length).toBeGreaterThan(0)
    for (const voice of effect.voices) {
      expect(voice.duration).toBeGreaterThan(0)
      expect(voice.volume).toBeGreaterThan(0)
      expect(voice.volume).toBeLessThanOrEqual(0.05)
    }
  }
})
test('preferred sound effects preserve the X-dump audition selection', () => {
  expect(selectedSoundEffectIds).toEqual([
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
  expect(selectedSoundEffects.map(effect => effect.id)).toEqual([...selectedSoundEffectIds])
  expect(selectedSoundEffects.map(effect => effect.label)).toEqual([
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
