import type {EgoAction, EgoPlayerHandle, EgoState} from 'ego-player'

import {useKeyboardControls} from '@react-three/drei/webgpu'
import EgoPlayer from 'ego-player'
import {useEffect, useRef} from 'react'

import {SoundEngine} from '#src/lib/audio/SoundEngine.ts'
import {cameraPose, floorHeight, galleryEvents, markControlled, useGallery} from '#src/lib/gallery.ts'
import {playerTelemetry} from '#src/lib/telemetry/index.ts'

const enabled = () => !cameraPose.focused && !useGallery.getState().panel
const cameraEnabled = () => !cameraPose.focused
const pointerLock = {selector: '#pointer-lock-managed-by-gallery'}
const userData = {kind: 'player'}
const onStep = () => {
  const {sound, room} = useGallery.getState()
  if (sound) {
    SoundEngine.existing()?.step(['cabinet', 'amber'].includes(room))
  }
}

export default function Player() {
  const player = useRef<EgoPlayerHandle>(null)
  const input = useKeyboardControls<EgoAction>()[1]
  useEffect(() => {
    const read = () => player.current?.getState() ?? null
    playerTelemetry.read = read
    const teleport = (event: Event) => {
      const {position, rotation} = (event as CustomEvent<{position: [number, number, number]
        rotation: [number, number, number, number]}>).detail
      cameraPose.focused = false
      // Gallery navigation describes camera poses; ego-player consistently uses feet.
      player.current?.teleport([position[0], Math.max(floorHeight(position) + 0.04, position[1] - 1.6), position[2]], rotation)
    }
    galleryEvents.addEventListener('teleport', teleport)
    return () => {
      galleryEvents.removeEventListener('teleport', teleport)
      if (playerTelemetry.read === read) {
        playerTelemetry.read = null
      }
      const diagnostics = globalThis.__gallery
      if (diagnostics) {
        delete diagnostics.player
      }
    }
  }, [])
  const onUpdate = (state: EgoState) => {
    const diagnostics = globalThis.__gallery
    if (diagnostics) {
      diagnostics.player = {
        keys: input(),
        position: state.position,
        enabled: true,
        grounded: state.grounded,
      }
    }
  }
  return <EgoPlayer ref={player} position={[0, 0.05, 5.8]} input={input} enabled={enabled} cameraEnabled={cameraEnabled} pointerLock={pointerLock} userData={userData} onInput={markControlled} onStep={onStep} onUpdate={onUpdate}/>
}
