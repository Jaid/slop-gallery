import type {Shot} from '#root/scripts/lib/cameraRecipe.ts'

import {describe, expect, test} from 'bun:test'

import {parseRecipe, sampleRecipe, tweens} from '#root/scripts/lib/cameraRecipe.ts'

const fallback: Shot = {
  position: [0, 1.7, 0],
  yaw: 0,
  pitch: 0,
  roll: 0,
  fov: 60,
}
describe('camera recipes', () => {
  test('every tween runs from 0 to 1', () => {
    for (const [name, tween] of Object.entries(tweens)) {
      expect(tween(0), name).toBeCloseTo(0)
      expect(tween(1), name).toBeCloseTo(1)
    }
    expect(tweens.easeInOutCubic(0.5)).toBeCloseTo(0.5)
    expect(tweens.easeOutQuad(0.5)).toBeCloseTo(0.75)
    expect(tweens.hold(0.99)).toBe(0)
  })
  test('animates each property on its own track and holds it outside its keyframes', () => {
    const recipe = parseRecipe([
      {
        time: 0,
        position: [0, 0, 0],
        yaw: 0,
      },
      {
        time: 1,
        fov: 30,
      },
      {
        time: 2,
        position: [4, 0, -2],
        yaw: 720,
        tween: 'easeInQuad',
      },
    ])
    expect(sampleRecipe(recipe, 0.5, fallback)).toEqual({
      position: [0.25, 0, -0.125],
      yaw: 45,
      pitch: 0,
      roll: 0,
      fov: 30,
    })
    expect(sampleRecipe(recipe, 3, fallback)).toMatchObject({
      position: [4, 0, -2],
      yaw: 720,
    })
  })
  test('uses the tween of the keyframe a segment leads to', () => {
    const recipe = parseRecipe([
      {
        time: 0,
        pitch: 0,
        tween: 'hold',
      },
      {
        time: 1,
        pitch: 10,
        tween: 'hold',
      },
      {
        time: 2,
        pitch: 20,
      },
    ])
    expect(sampleRecipe(recipe, 0.5, fallback).pitch).toBe(0)
    expect(sampleRecipe(recipe, 1, fallback).pitch).toBe(10)
    expect(sampleRecipe(recipe, 1.5, fallback).pitch).toBe(15)
  })
  test('rejects malformed recipes with the offending keyframe', () => {
    expect(() => parseRecipe({keyframes: []})).toThrow('non-empty JSON array')
    expect(() => parseRecipe([{time: 1}, {time: 1}])).toThrow('Keyframe 1 must come after keyframe 0')
    expect(() => parseRecipe([{
      time: 0,
      tween: 'bouncy',
    }])).toThrow('unknown tween "bouncy"')
    expect(() => parseRecipe([{
      time: 0,
      position: [1, 2],
    }])).toThrow('Keyframe 0 needs position')
    expect(() => parseRecipe([{
      time: 0,
      fov: 200,
    }])).toThrow('between 0 and 180')
    expect(() => parseRecipe([{
      time: 0,
      zoom: 2,
    }])).toThrow('unknown property “zoom”')
  })
})
