import {expect, test} from 'bun:test'

import {temporarySoundEffects} from '../../src/lib/audio/temporarySoundEffects.ts'

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
