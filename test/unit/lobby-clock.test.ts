import {afterAll, describe, expect, test} from 'bun:test'

import lobbyClock, {clockHandAngles, clockNumerals, gloireRays, gloireReach, lobbyClockCenterY} from '../../src/lib/gallery/lobbyClock.ts'
import LobbyClockGeometry, {breguetHand, clockLayers, gloireRay, numeralStrokes} from '../../src/lib/gallery/LobbyClockGeometry.ts'
import lobbyVault from '../../src/lib/gallery/lobbyVault.ts'
import {roseCenterY, roundFrameReach} from '../../src/lib/gallery/LobbyVaultGeometry.ts'
import {triangleCount} from '../../src/lib/geometry.ts'
import ClockDialMaterial from '../../src/lib/materials/ClockDialMaterial.ts'

const geometry = new LobbyClockGeometry
afterAll(() => geometry.dispose())
const parts = () => [geometry.dial, geometry.gold, geometry.hourHand, geometry.minuteHand, geometry.stone]
/** Soffit of the wall arch that frames the lunette, measured from the middle of the springing line. */
const archSoffit = lobbyVault.radius - lobbyVault.rib.depth
describe('the Lobby’s great clock', () => {
  test('answers the north rose window at the same height and size', () => {
    expect(lobbyClockCenterY).toBeCloseTo(roseCenterY, 9)
    expect(lobbyClock.radius).toBe(lobbyVault.rose.radius)
  })
  test('fits inside the south lunette, clear of the wall arch and the cornice', () => {
    const reach = roundFrameReach(lobbyClock.radius)
    expect(lobbyClock.rise + reach).toBeLessThan(archSoffit)
    expect(lobbyClock.rise - reach).toBeGreaterThan(0)
    for (const part of parts()) {
      const box = part.boundingBox!
      expect(Math.max(-box.min.x, box.max.x)).toBeLessThan(lobbyVault.radius)
      expect(box.max.y + lobbyClock.rise).toBeLessThan(archSoffit)
      expect(box.min.y + lobbyClock.rise).toBeGreaterThan(0)
      // Nothing stands out far enough to meet a chandelier or a thrown prop’s idea of the wall.
      expect(box.max.z).toBeLessThan(0.25)
    }
  })
  test('the dial, the hands and the boss stand in layers in front of each other', () => {
    expect(geometry.dial.boundingBox!.max.z).toBeCloseTo(clockLayers.dial, 6)
    expect(geometry.hourHand.boundingBox!.min.z).toBeGreaterThan(lobbyClock.numerals.relief + clockLayers.dial)
    expect(geometry.minuteHand.boundingBox!.min.z).toBeGreaterThan(geometry.hourHand.boundingBox!.max.z)
    expect(clockLayers.boss).toBeGreaterThan(geometry.minuteHand.boundingBox!.max.z)
  })
  test('the hands reach their rings: the hour hand inside the numerals, the minute hand onto the minute track', () => {
    const {chapter, hands, numerals, track} = lobbyClock
    expect(hands.hour).toBeLessThan(numerals.base)
    expect(hands.hour).toBeLessThan(chapter)
    expect(hands.minute).toBeGreaterThan(numerals.base + numerals.height)
    expect(hands.minute).toBeLessThan(track[1])
    for (const [hand, length] of [[geometry.hourHand, hands.hour], [geometry.minuteHand, hands.minute]] as const) {
      const box = hand.boundingBox!
      expect(box.max.y).toBeCloseTo(length, 3)
      // Pointing at twelve, centered on the arbor.
      expect(box.max.x + box.min.x).toBeCloseTo(0, 6)
      expect(box.min.y).toBeLessThan(0)
    }
  })
  test('the hands tell local time and jump once a minute', () => {
    const quarterPastThree = clockHandAngles(new Date(2026, 9, 20, 15, 15, 0))
    expect(quarterPastThree.minute).toBeCloseTo(Math.PI / 2, 9)
    expect(quarterPastThree.hour).toBeCloseTo(3.25 / 12 * Math.PI * 2, 9)
    const noon = clockHandAngles(new Date(2026, 9, 20, 12, 0, 0))
    expect(noon.hour).toBe(0)
    expect(noon.minute).toBe(0)
    // Within a minute the hands stand still, so they don’t keep the sun’s cached shadow map rendering.
    expect(clockHandAngles(new Date(2026, 9, 20, 0, 59, 59, 999))).toEqual(clockHandAngles(new Date(2026, 9, 20, 0, 59, 0)))
    const almostOne = clockHandAngles(new Date(2026, 9, 20, 0, 59, 30))
    expect(almostOne.minute).toBeCloseTo(59 / 60 * Math.PI * 2, 9)
    expect(almostOne.hour).toBeCloseTo(59 / 720 * Math.PI * 2, 9)
  })
  test('Roman numerals use the clockmakers’ IIII and are laid out symmetrically', () => {
    expect(clockNumerals).toHaveLength(12)
    expect(clockNumerals[3]).toBe('IIII')
    for (const numeral of clockNumerals) {
      const {strokes, width} = numeralStrokes(numeral)
      // One stroke per I, two per V or X, and a bar across the head and the foot.
      expect(strokes).toHaveLength(numeral.split('').reduce((sum, character) => sum + (character === 'I' ? 1 : 2), 2))
      for (const {from, to} of strokes) {
        for (const [x, y] of [from, to]) {
          expect(Math.abs(x)).toBeLessThanOrEqual(width / 2 + 1e-9)
          expect(y).toBeGreaterThanOrEqual(0)
          expect(y).toBeLessThanOrEqual(lobbyClock.numerals.height)
        }
      }
      // The widest numeral still fits between its neighbors on the ring.
      expect(width).toBeLessThan(lobbyClock.numerals.base * Math.PI * 2 / 12)
    }
    expect(() => numeralStrokes('L')).toThrow(RangeError)
  })
  test('the gloire fans out across the lunette, symmetric, alternating and inside its bounds', () => {
    const rays = gloireRays()
    const {gloire} = lobbyClock
    expect(rays.length).toBeGreaterThan(gloire.count * 0.6)
    expect(rays.length).toBeLessThan(gloire.count)
    for (const ray of rays) {
      const tip = gloire.start + ray.length
      expect(ray.length).toBeGreaterThanOrEqual(gloire.minimum)
      expect(tip).toBeLessThanOrEqual(gloireReach(ray.angle) + 1e-9)
      const x = Math.cos(ray.angle) * tip
      const y = lobbyClock.rise + Math.sin(ray.angle) * tip
      expect(Math.hypot(x, y)).toBeLessThanOrEqual(archSoffit - gloire.archClearance + 1e-9)
      expect(y).toBeGreaterThanOrEqual(gloire.cornerClearance - 1e-9)
      // Mirrored across the vertical axis.
      const mirror = rays.find(other => Math.abs(Math.cos(other.angle) + Math.cos(ray.angle)) < 1e-9 && Math.abs(Math.sin(other.angle) - Math.sin(ray.angle)) < 1e-9)
      expect(mirror?.length).toBeCloseTo(ray.length, 9)
      expect(mirror?.flame).toBe(ray.flame)
    }
    // Straight rays at the quarters, flames between them.
    expect(rays.find(ray => ray.angle === 0)?.flame).toBe(false)
    expect(rays.find(ray => Math.abs(ray.angle - Math.PI / 2) < 1e-9)?.flame).toBe(false)
    // Rays start behind the frame’s outer ring, so no gap shows between frame and gloire.
    expect(gloire.start).toBeLessThan(roundFrameReach(lobbyClock.radius))
  })
  test('rays are chased with a ridge and lie flat on the wall', () => {
    for (const flame of [false, true]) {
      const ray = gloireRay(3, 1.2, flame)
      ray.computeBoundingBox()
      const box = ray.boundingBox!
      expect(box.min.z).toBeCloseTo(0, 6)
      expect(box.max.z).toBeCloseTo(lobbyClock.gloire.relief, 6)
      expect(box.min.x).toBeCloseTo(3, 6)
      expect(box.max.x).toBeCloseTo(4.2, 6)
      const normals = ray.getAttribute('normal')
      for (let i = 0; i < normals.count; i++) {
        expect(Number.isFinite(normals.getZ(i))).toBe(true)
      }
      ray.dispose()
    }
  })
  test('Breguet hands are flat plates of the hand thickness', () => {
    const hand = breguetHand(1, {
      pomme: 0.1,
      shaft: 0.05,
      tail: 0.1,
    })
    const box = hand.boundingBox!
    expect(box.max.z - box.min.z).toBeCloseTo(clockLayers.handThickness, 6)
    expect(box.max.y).toBeCloseTo(1, 3)
    hand.dispose()
  })
  test('keeps a reasonable triangle budget', () => {
    const total = parts().reduce((sum, part) => sum + triangleCount(part), 0)
    expect(total).toBeLessThan(20_000)
  })
  test('the dial material validates its rings', () => {
    expect(() => {
      const material = new ClockDialMaterial({
        chapter: 1.47,
        radius: 2.5,
      })
      material.dispose()
    }).not.toThrow()
    expect(() => new ClockDialMaterial({
      chapter: 3,
      radius: 2.5,
    })).toThrow(RangeError)
  })
})
