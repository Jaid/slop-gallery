import type {EgoState} from 'ego-player'

import {afterEach, beforeEach, expect, mock, spyOn, test} from 'bun:test'

import {attachPlayerAudio, onPlayerLand, onPlayerStep, onPlayerZoomChange, onPlayerZoomTransition} from '../../src/lib/audio/playerAudio.ts'
import SoundEngine from '../../src/lib/audio/SoundEngine.ts'
import {useGallery} from '../../src/lib/gallery/store.ts'
import {getPlayerZoom, setPlayerZoom} from '../../src/lib/rendering/playerView.ts'

const original = useGallery.getState()
const sound = {
  step: mock((_wood: boolean, _speed: number, _crouching: boolean) => {}),
  land: mock((_wood: boolean, _speed: number, _crouching: boolean, _impactSpeed: number) => {}),
  zoomTransition: mock((_extended: boolean, _retract: boolean, _duration: number) => {}),
  setZoom: mock((_amount: number) => {}),
  viewTransition: mock((_entering: boolean) => {}),
  mute: mock((_muted: boolean) => {}),
  stopPlayerSounds: mock(() => {}),
}
let existing: ReturnType<typeof spyOn<typeof SoundEngine, 'existing'>>
let dispose: (() => void) | undefined
const state: EgoState = {
  active: true,
  grounded: true,
  crouching: false,
  position: {
    x: 0,
    y: 0.02,
    z: 0,
  },
  velocity: {
    x: 3,
    y: -0.1,
    z: 4,
  },
}
beforeEach(() => {
  useGallery.setState({
    sound: true,
    locked: true,
    panel: null,
    inspecting: null,
  })
  existing = spyOn(SoundEngine, 'existing').mockReturnValue(sound as unknown as SoundEngine)
  for (const method of Object.values(sound)) {
    method.mockClear()
  }
})
afterEach(() => {
  dispose?.()
  dispose = undefined
  existing.mockRestore()
  useGallery.setState(original)
  setPlayerZoom(0)
})
test('player footsteps use horizontal physical speed and landings use pre-impact speed', () => {
  onPlayerStep(state)
  expect(sound.step).toHaveBeenCalledWith(expect.any(Boolean), 5, false)
  onPlayerStep({
    ...state,
    crouching: true,
  })
  expect(sound.step).toHaveBeenLastCalledWith(expect.any(Boolean), 5, true)
  onPlayerLand(state, 7)
  expect(sound.land).toHaveBeenCalledWith(expect.any(Boolean), 5, false, 7)
  onPlayerStep({
    ...state,
    active: false,
  })
  onPlayerLand({
    ...state,
    active: false,
  }, 8)
  useGallery.setState({sound: false})
  onPlayerStep(state)
  onPlayerLand(state, 8)
  expect(sound.step).toHaveBeenCalledTimes(2)
  expect(sound.land).toHaveBeenCalledTimes(1)
})
test('visual zoom remains independent of mute while audio uses the actual transition kind', () => {
  onPlayerZoomTransition({
    from: 'casual',
    to: 'extended',
    direction: 'forward',
    duration: 0.4,
  })
  expect(sound.zoomTransition).toHaveBeenCalledWith(true, false, 0.4)
  onPlayerZoomTransition({
    from: 'extended',
    to: 'casual',
    direction: 'retract',
    duration: 0.3,
  })
  expect(sound.zoomTransition).toHaveBeenLastCalledWith(true, true, 0.3)
  onPlayerZoomChange(0.8)
  expect(sound.setZoom).toHaveBeenLastCalledWith(0.8)
  useGallery.setState({sound: false})
  onPlayerZoomChange(0.5)
  expect(getPlayerZoom()).toBe(0.5)
  expect(sound.setZoom).toHaveBeenLastCalledWith(0)
  onPlayerZoomTransition({
    from: 'none',
    to: 'casual',
    direction: 'forward',
    duration: 0.2,
  })
  expect(sound.zoomTransition).toHaveBeenCalledTimes(2)
})
test('inspection cues fire once for entry/leave, not repeated state updates or focus targets', () => {
  dispose = attachPlayerAudio(new EventTarget)
  useGallery.setState({inspecting: 'knot-one'})
  useGallery.setState({inspecting: 'knot-one'})
  useGallery.setState({inspecting: 'knot-two'})
  useGallery.setState({inspecting: null})
  useGallery.setState({inspecting: null})
  expect(sound.viewTransition.mock.calls).toEqual([[true], [false]])
  useGallery.setState({sound: false})
  useGallery.setState({inspecting: 'portrait-one'})
  useGallery.setState({inspecting: null})
  expect(sound.viewTransition).toHaveBeenCalledTimes(2)
})
test('mute, lock loss, blur and unmount stop audio even without another render frame', () => {
  const events = new EventTarget
  dispose = attachPlayerAudio(events)
  setPlayerZoom(1)
  useGallery.setState({sound: false})
  expect(sound.mute).toHaveBeenLastCalledWith(true)
  expect(sound.setZoom).toHaveBeenLastCalledWith(0)
  useGallery.setState({sound: true})
  expect(sound.setZoom).toHaveBeenLastCalledWith(1)
  useGallery.setState({locked: false})
  expect(sound.stopPlayerSounds).toHaveBeenCalledTimes(1)
  onPlayerZoomChange(0.7)
  expect(sound.setZoom).toHaveBeenLastCalledWith(0)
  events.dispatchEvent(new Event('blur'))
  expect(sound.stopPlayerSounds).toHaveBeenCalledTimes(2)
  dispose()
  dispose = undefined
  const count = sound.stopPlayerSounds.mock.calls.length
  events.dispatchEvent(new Event('blur'))
  useGallery.setState({inspecting: 'ignored'})
  expect(sound.stopPlayerSounds).toHaveBeenCalledTimes(count)
  expect(sound.viewTransition).not.toHaveBeenCalled()
})
