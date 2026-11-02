import type AmbienceLoop from '../../src/lib/audio/ambience/base/AmbienceLoop.ts'
import type {AudioOutput} from '../../src/lib/audio/proceduralAudio.ts'
import type {MoodFade} from '../../src/lib/moods/base/Mood.ts'

import {afterEach, describe, expect, test} from 'bun:test'

import {AmbientLight, Color, HemisphereLight, PointLight, Scene} from 'three/webgpu'

import {fusionTiming} from '../../src/lib/gallery/fusion/timing.ts'
import {orbs} from '../../src/lib/gallery/orbs/index.ts'
import Mood from '../../src/lib/moods/base/Mood.ts'
import {readMood} from '../../src/lib/moods/forcedMood.ts'
import {fusionMood, moods} from '../../src/lib/moods/index.ts'
import MoodMixer, {moodFade} from '../../src/lib/moods/MoodMixer.ts'
import {applyLightLevels, lightTint, noTint} from '../../src/lib/rendering/lightLevels.ts'

/** a loop that only records what it was told */
class RecordingLoop {
  levels: Array<number> = []
  started = 0
  stopped = 0
  setLevel(level: number) {
    this.levels.push(level)
  }

  start() {
    this.started++
  }

  stop() {
    this.stopped++
  }
}
class TestMood extends Mood {
  override readonly fade?: MoodFade
  readonly fill = {
    color: '#808080',
    gain: 1,
  }
  readonly grade = {
    shadow: '#000000',
    midtone: '#ff0000',
    highlight: '#ffffff',
    strength: 0.5,
  }
  readonly lamps = {
    color: '#ff0000',
    gain: 0.5,
  }
  readonly loops: Array<RecordingLoop> = []
  readonly title: string

  constructor(readonly id: string, fade?: MoodFade) {
    super()
    this.title = id
    this.fade = fade
  }

  createAmbience() {
    const loop = new RecordingLoop
    this.loops.push(loop)
    return loop as unknown as AmbienceLoop
  }
}
const output = {} as AudioOutput
const step = 1 / 60
/** Steps the mixer toward `target` for `seconds`. */
const run = (mixer: MoodMixer, target: Mood | null, seconds: number, audio?: AudioOutput) => {
  for (let time = 0; time < seconds - 1e-9; time += step) {
    mixer.update(target, step, audio)
  }
}
describe('mood mixer', () => {
  test('a mood fades in over its fade time, tints lamps and fill apart and fades out again', () => {
    const mixer = new MoodMixer
    const mood = new TestMood('test')
    const lamp = new PointLight
    const fill = new AmbientLight
    run(mixer, mood, moodFade.in / 2)
    expect(mixer.mood).toBe(mood)
    expect(mixer.amount).toBeCloseTo(0.5, 1)
    run(mixer, mood, moodFade.in)
    expect(mixer.amount).toBe(1)
    // Linear colors: red at half gain for the lamps, middle gray for the fill.
    expect(mixer.tintOf(lamp).toArray()).toEqual([0.5, 0, 0])
    const gray = new Color('#808080')
    for (const [index, channel] of mixer.tintOf(fill).toArray().entries()) {
      expect(channel).toBeCloseTo(gray.toArray()[index], 12)
    }
    run(mixer, null, moodFade.out + step)
    expect(mixer.amount).toBe(0)
    expect(mixer.tintOf(lamp).equals(noTint)).toBe(true)
    expect(mixer.mood).toBeNull()
  })
  test('switching moods fades the first one out completely before the next one comes in', () => {
    const mixer = new MoodMixer
    const first = new TestMood('first')
    const second = new TestMood('second')
    run(mixer, first, moodFade.in)
    run(mixer, second, moodFade.out / 2)
    expect(mixer.mood).toBe(first)
    expect(mixer.amount).toBeGreaterThan(0)
    run(mixer, second, moodFade.out / 2 + step * 2)
    expect(mixer.mood).toBe(second)
    run(mixer, second, moodFade.in)
    expect(mixer.amount).toBe(1)
  })
  test('a mood with a pace of its own comes and goes at it, also while it gives way to another one', () => {
    const mixer = new MoodMixer
    const slow = new TestMood('slow', {
      in: 2,
      out: 1,
    })
    const next = new TestMood('next')
    run(mixer, slow, 1)
    expect(mixer.amount).toBeCloseTo(0.5, 1)
    run(mixer, slow, 1)
    expect(mixer.amount).toBe(1)
    run(mixer, next, 0.5)
    expect(mixer.mood).toBe(slow)
    expect(mixer.amount).toBeCloseTo(0.5, 1)
    run(mixer, next, 0.5 + step * 2)
    expect(mixer.mood).toBe(next)
  })
  test('a light with userData.untinted keeps its color through the mood', () => {
    const mixer = new MoodMixer
    const mood = new TestMood('test')
    const lamp = new PointLight
    const portal = new PointLight
    portal.userData.untinted = true
    run(mixer, mood, moodFade.in)
    expect(mixer.tintOf(lamp).equals(noTint)).toBe(false)
    expect(mixer.tintOf(portal)).toBe(noTint)
  })
  test('the loop starts once there is an output, follows the strength and stops with its mood', () => {
    const mixer = new MoodMixer
    const mood = new TestMood('test')
    run(mixer, mood, 0.3)
    expect(mood.loops).toHaveLength(0)
    run(mixer, mood, moodFade.in, output)
    expect(mood.loops).toHaveLength(1)
    const [loop] = mood.loops
    expect(loop.started).toBe(1)
    expect(loop.levels[0]).toBe(0)
    expect(loop.levels.at(-1)).toBe(1)
    run(mixer, null, moodFade.out + step, output)
    expect(loop.levels.at(-1)).toBeCloseTo(0, 6)
    expect(loop.stopped).toBe(1)
    // Holding it again makes a fresh loop.
    run(mixer, mood, step, output)
    expect(mood.loops).toHaveLength(2)
    mixer.dispose()
    expect(mood.loops[1].stopped).toBe(1)
    expect(mixer.mood).toBeNull()
  })
})
describe('light tint', () => {
  afterEach(() => {
    lightTint.current = () => noTint
  })
  test('tints every light color, the hemisphere’s ground too, and returns to what the owner set', () => {
    const scene = new Scene
    const lamp = new PointLight('#ffffff', 2)
    const sky = new HemisphereLight('#4080ff', '#806040', 1)
    scene.add(lamp, sky)
    const skyColor = sky.color.clone()
    const ground = sky.groundColor.clone()
    const tint = new Color(0.5, 1, 0)
    lightTint.current = () => tint
    applyLightLevels(scene)
    expect(lamp.color.toArray()).toEqual([0.5, 1, 0])
    expect(sky.groundColor.toArray()).toEqual(ground.clone().multiply(tint).toArray())
    // Applied every frame, the tint does not compound.
    applyLightLevels(scene)
    expect(lamp.color.toArray()).toEqual([0.5, 1, 0])
    // A color the owner sets meanwhile is the new base.
    lamp.color.set('#ff0000')
    applyLightLevels(scene)
    expect(lamp.color.toArray()).toEqual([0.5, 0, 0])
    lightTint.current = () => noTint
    applyLightLevels(scene)
    expect(lamp.color.toArray()).toEqual([1, 0, 0])
    expect(sky.color.toArray()).toEqual(skyColor.toArray())
    expect(sky.groundColor.toArray()).toEqual(ground.toArray())
    expect(lamp.intensity).toBe(2)
  })
})
describe('moods', () => {
  test('every orb casts a mood of its own, sharing its id', () => {
    expect(orbs.map(orb => orb.mood.id).toSorted()).toEqual(orbs.map(orb => orb.id).toSorted())
    const distinct = new Set(orbs.map(orb => orb.mood))
    expect(distinct.size).toBe(orbs.length)
    for (const mood of moods) {
      expect(mood.grade.strength).toBeGreaterThan(0)
      expect(mood.grade.strength).toBeLessThanOrEqual(1)
      for (const color of [mood.grade.shadow, mood.grade.midtone, mood.grade.highlight, mood.lamps.color, mood.fill.color]) {
        expect(color).toMatch(/^#[\da-f]{6}$/)
      }
      const ambience = mood.createAmbience()
      expect(ambience.playing).toBe(false)
      expect(ambience.id).toBe(`mood-${mood.id}`)
    }
  })
  test('the fusion’s mood belongs to no orb and comes over the world while the intro plays', () => {
    expect(moods).toContain(fusionMood)
    const orbMoods: ReadonlyArray<Mood> = orbs.map(orb => orb.mood)
    expect(orbMoods).not.toContain(fusionMood)
    expect(fusionMood.fade.in).toBe(fusionTiming.intro)
  })
  test('?mood names a mood by its id and ignores anything else', () => {
    expect(readMood('http://localhost/?mood=horror')).toBe('horror')
    expect(readMood('http://localhost/?mood=fusion')).toBe('fusion')
    expect(readMood('http://localhost/?mood=sunshine')).toBe('')
    expect(readMood('http://localhost/')).toBe('')
  })
})
