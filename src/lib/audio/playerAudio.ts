import type {EgoState, EgoZoomTransition} from 'ego-player'

import {woodenFloor} from '#level/navigation.ts'
import {useGallery} from '#src/lib/gallery/store.ts'
import {getPlayerZoom, setPlayerZoom} from '#src/lib/rendering/playerView.ts'

import SoundEngine from './SoundEngine.ts'

const isWood = (state: EgoState) => {
  const {x, y, z} = state.position
  return woodenFloor(useGallery.getState().room, [x, y, z])
}
const stop = () => SoundEngine.existing()?.stopPlayerSounds()

export function onPlayerStep(state: EgoState) {
  if (state.active && useGallery.getState().sound) {
    SoundEngine.existing()?.step(isWood(state), Math.hypot(state.velocity.x, state.velocity.z))
  }
}

export function onPlayerLand(state: EgoState, impactSpeed: number) {
  if (state.active && useGallery.getState().sound) {
    SoundEngine.existing()?.land(isWood(state), impactSpeed)
  }
}

export function onPlayerZoomChange(amount: number) {
  setPlayerZoom(amount)
  const {sound, locked, panel} = useGallery.getState()
  SoundEngine.existing()?.setZoom(sound && locked && !panel ? amount : 0)
}

export function onPlayerZoomTransition(transition: EgoZoomTransition) {
  const {sound, locked, panel} = useGallery.getState()
  if (sound && locked && !panel) {
    SoundEngine.existing()?.zoomTransition(transition.from === 'extended' || transition.to === 'extended', transition.direction === 'retract', transition.duration)
  }
}

/** Both portrait and knot inspection publish inspecting on entry/release, not on every frame. */
export function attachPlayerAudio(events: Pick<EventTarget, 'addEventListener' | 'removeEventListener'> = globalThis) {
  events.addEventListener('blur', stop)
  const unsubscribe = useGallery.subscribe((state, previous) => {
    const sound = SoundEngine.existing()
    if (state.sound !== previous.sound) {
      sound?.mute(!state.sound)
      sound?.setZoom(state.sound && state.locked && !state.panel ? getPlayerZoom() : 0)
    }
    if (!state.locked || state.panel) {
      if (previous.locked && !previous.panel) {
        stop()
      }
      return
    }
    if (state.sound && !!state.inspecting !== !!previous.inspecting) {
      sound?.viewTransition(!!state.inspecting)
    }
  })
  return () => {
    unsubscribe()
    events.removeEventListener('blur', stop)
    stop()
  }
}
