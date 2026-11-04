import type IntroOrbit from '../camera/IntroOrbit.ts'
import type {IntroDirection} from '../camera/IntroOrbit.ts'

import {create} from 'zustand'

import world from '#src/worlds/current.ts'

import SoundEngine from '../audio/SoundEngine.ts'
import {environmentPick} from '../environmentSeed.ts'
import {readRoom, readSpawn} from './spawn.ts'
import {useGallery} from './store.ts'

/** Whether a URL leaves the camera to the intro: none of `?spawn`, `?room` or the test hooks of `?test=true`, which pose and teleport it, puts it anywhere else. */
export function readIntro(input: URL | string = typeof location === 'undefined' ? '' : location.href): boolean {
  const url = new URL(input, 'http://localhost/')
  return !readSpawn(input) && !readRoom(input) && url.searchParams.get('test') !== 'true'
}

/** Which way the intro circles in the game of `seed`, a coin flip of its own. */
export function introDirection(seed: number): IntroDirection {
  return environmentPick(seed, 'intro-orbit', [1, -1] as const)
}

/** The orbit the camera circles behind the first menu until the player first enters, or null once the player has entered and in worlds and URLs without an intro. */
export const useIntro = create<{orbit: IntroOrbit | null}>(() => ({orbit: (readIntro() ? world.introOrbit : undefined) ?? null}))

/** Ends the intro for the rest of the page session. */
export function endIntro() {
  useIntro.setState({orbit: null})
}

/**
 * Lets the intro sound like the game, its ambience heard from the orbiting camera, instead of waiting for the player’s first click to make the sound engine: makes it right away, muted as the player switched it, and resumes it once the browser lets it, at once where autoplay is allowed or else on the page’s first click or key. Returns the cleanup.
 */
export function hearIntro(target: Pick<EventTarget, 'addEventListener' | 'removeEventListener'> = globalThis) {
  const engine = SoundEngine.get()
  engine.mute(!useGallery.getState().sound)
  const resume = () => {
    void engine.resume().catch(() => {})
  }
  const activate = () => {
    resume()
    target.removeEventListener('pointerdown', activate, true)
    target.removeEventListener('keydown', activate, true)
  }
  resume()
  target.addEventListener('pointerdown', activate, true)
  target.addEventListener('keydown', activate, true)
  return () => {
    target.removeEventListener('pointerdown', activate, true)
    target.removeEventListener('keydown', activate, true)
  }
}
