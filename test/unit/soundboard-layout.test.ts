import {expect, test} from 'bun:test'

import {insideSoundboard, soundboardBounds, soundboardLayout, soundboardSize, soundboardWallDistance, soundboardWalls} from '../../src/lib/audio/soundboard.ts'
import SoundboardLayout, {soundboardButton} from '../../src/lib/audio/SoundboardLayout.ts'
import {archivedSoundEffects, enabledSoundEffects, soundEffects} from '../../src/lib/audio/soundEffects.ts'

test('soundboard inventory drives both generated walls without a manual button list', () => {
  expect(enabledSoundEffects.length + archivedSoundEffects.length).toBe(soundEffects.length)
  expect(soundboardLayout.sections.enabled.count).toBe(enabledSoundEffects.length)
  expect(soundboardLayout.sections.archived.count).toBe(archivedSoundEffects.length)
  expect(soundboardLayout.sections.enabled).toMatchObject({
    columns: 4,
    rows: 3,
  })
  expect(soundboardLayout.sections.archived).toMatchObject({
    columns: 5,
    rows: 4,
  })
  expect(soundboardWalls.filter(wall => wall.id === 'soundboard-enabled' || wall.id === 'soundboard-archived')).toHaveLength(2)
})
test('generated button positions stay inside the content wall and center partial rows', () => {
  for (const [section, effects] of [['enabled', enabledSoundEffects], ['archived', archivedSoundEffects]] as const) {
    const positions = effects.map((_, index) => soundboardLayout.buttonPosition(section, index))
    expect(new Set(positions.map(position => position.join(','))).size).toBe(effects.length)
    for (const [x, y] of positions) {
      expect(Math.abs(x) + soundboardButton.width / 2).toBeLessThan(soundboardSize[0] / 2)
      expect(y - soundboardButton.height / 2).toBeGreaterThan(0.5)
      expect(y + soundboardButton.height / 2).toBeLessThan(soundboardBounds.height - 0.8)
    }
  }
})
test('room dimensions grow automatically with the catalog and navigation follows the generated shell', () => {
  const expanded = new SoundboardLayout({
    enabled: 40,
    archived: archivedSoundEffects.length,
  })
  expect(expanded.size[0]).toBeGreaterThan(soundboardSize[0])
  expect(expanded.size[1]).toBeGreaterThan(soundboardSize[1])
  expect(insideSoundboard([0, 0.04, 0])).toBe(true)
  expect(insideSoundboard([soundboardBounds.maxX + 0.01, 0.04, 0])).toBe(false)
  expect(soundboardWallDistance([0, 1.6, 0], [0, 0, -1])).toBeCloseTo(-soundboardBounds.northZ)
})
