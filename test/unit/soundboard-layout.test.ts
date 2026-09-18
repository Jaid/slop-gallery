import {expect, test} from 'bun:test'

import {announcerSamples} from '../../src/lib/audio/announcerSamples.ts'
import {insideSoundboard, soundboardBounds, soundboardGroundStripes, soundboardGroundSurface, soundboardLayout, soundboardSize, soundboardWallDistance, soundboardWalls} from '../../src/lib/audio/soundboard.ts'
import SoundboardLayout, {soundboardButton} from '../../src/lib/audio/SoundboardLayout.ts'
import {archivedSoundEffects, enabledSoundEffects, soundEffects} from '../../src/lib/audio/soundEffects.ts'

test('soundboard inventory drives both generated walls without a manual button list', () => {
  expect(enabledSoundEffects.length + archivedSoundEffects.length).toBe(soundEffects.length)
  expect(soundboardLayout.sections.enabled.count).toBe(enabledSoundEffects.length)
  expect(soundboardLayout.sections.archived.count).toBe(archivedSoundEffects.length)
  expect(soundboardLayout.sections.enabled).toMatchObject({
    columns: 5,
    rows: 4,
  })
  expect(soundboardLayout.sections.archived).toMatchObject({
    columns: 7,
    rows: 6,
  })
  expect(soundboardWalls.filter(wall => wall.id === 'soundboard-enabled' || wall.id === 'soundboard-archived')).toHaveLength(2)
})
test('SFX inventories occupy the long walls and leave both short walls free for auxiliary panels', () => {
  const enabled = soundboardWalls.find(wall => wall.id === 'soundboard-enabled')!
  const archived = soundboardWalls.find(wall => wall.id === 'soundboard-archived')!
  const north = soundboardWalls.find(wall => wall.id === 'soundboard-north')!
  const south = soundboardWalls.find(wall => wall.id === 'soundboard-south')!
  expect(enabled.center[0]).toBe(soundboardBounds.minX)
  expect(archived.center[0]).toBe(soundboardBounds.maxX)
  expect(enabled.width).toBe(soundboardSize[2])
  expect(archived.width).toBe(soundboardSize[2])
  expect(north.width).toBe(soundboardSize[0])
  expect(south.width).toBe(soundboardSize[0])
})
test('announcer wall exposes a small prerecorded sample set on the north short wall', () => {
  const north = soundboardWalls.find(wall => wall.id === 'soundboard-north')!
  expect(north.center[2]).toBe(soundboardBounds.northZ)
  expect(announcerSamples).toHaveLength(6)
  expect(new Set(announcerSamples.map(sample => sample.id)).size).toBe(announcerSamples.length)
  expect(announcerSamples.every(sample => sample.audio.endsWith('.opus'))).toBe(true)
})
test('sprint lane spans four equal longitudinal material stripes', () => {
  expect(soundboardSize[2]).toBeGreaterThanOrEqual(40)
  expect(soundboardGroundStripes.map(stripe => stripe.surface)).toEqual(['generic', 'hollow', 'glass', 'fabric'])
  const stripeWidths = new Set(soundboardGroundStripes.map(stripe => stripe.width))
  expect(stripeWidths).toEqual(new Set([soundboardSize[0] / 4]))
  for (const stripe of soundboardGroundStripes) {
    expect(soundboardGroundSurface([stripe.centerX, 0.04, soundboardBounds.southZ - 3.2])).toBe(stripe.surface)
    expect(soundboardGroundSurface([stripe.centerX, 0.04, soundboardBounds.northZ + 3.2])).toBe(stripe.surface)
  }
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
    enabled: 80,
    archived: archivedSoundEffects.length,
  })
  expect(expanded.size[0]).toBeGreaterThan(soundboardSize[0])
  expect(expanded.size[1]).toBeGreaterThan(soundboardSize[1])
  expect(insideSoundboard([0, 0.04, 0])).toBe(true)
  expect(insideSoundboard([soundboardBounds.maxX + 0.01, 0.04, 0])).toBe(false)
  expect(soundboardWallDistance([0, 1.6, 0], [0, 0, -1])).toBeCloseTo(-soundboardBounds.northZ)
})
