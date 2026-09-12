import type {EgoAction, EgoPlayerHandle, EgoState} from 'ego-player'

import {useKeyboardControls} from '@react-three/drei/webgpu'
import {useThree} from '@react-three/fiber/webgpu'
import EgoPlayer from 'ego-player'
import {useEffect, useRef, useState} from 'react'
import {Euler, Quaternion} from 'three/webgpu'

import {insideLevel, levelFloorHeight, woodenFloor} from '#level/navigation.ts'
import SoundEngine from '#src/lib/audio/SoundEngine.ts'
import {cameraPose, galleryEvents, markControlled, narrate, useGallery} from '#src/lib/gallery.ts'
import {activateInteractiveObject} from '#src/lib/gallery/interactiveObjects.ts'
import {playerSession, playerSpawn} from '#src/lib/gallery/PlayerSession.ts'
import portraitObjects from '#src/lib/gallery/portraitObjects.ts'
import {playerTelemetry} from '#src/lib/telemetry/index.ts'
import recordPlayerDump from '#src/lib/telemetry/recordPlayerDump.ts'

const enabled = () => !cameraPose.focused && !useGallery.getState().panel
const cameraEnabled = () => !cameraPose.focused
const pointerLock = {selector: '#pointer-lock-managed-by-gallery'}
const onInteract = () => {
  const {active, held} = useGallery.getState()
  if (!active || held || activateInteractiveObject(active)) {
    return
  }
  if (portraitObjects.has(active)) {
    narrate(active)
  }
}
const onStep = (state: EgoState) => {
  const {sound, room} = useGallery.getState()
  if (sound) {
    const {x, y, z} = state.position
    const wooden = woodenFloor(room, [x, y, z])
    SoundEngine.existing()?.step(wooden)
  }
}

export default function Player() {
  const player = useRef<EgoPlayerHandle>(null)
  const input = useKeyboardControls<EgoAction>()[1]
  const camera = useThree(s => s.camera)
  const [initial] = useState(() => playerSession.snapshot())
  const [angles] = useState(() => new Euler(0, 0, 0, 'YXZ'))
  const playerEpoch = useGallery(s => s.playerEpoch)
  useEffect(() => {
    const read = () => player.current?.getState() ?? null
    playerTelemetry.read = read
    const releaseZoom = () => player.current?.releaseZoom()
    galleryEvents.addEventListener('release-zoom', releaseZoom)
    const teleport = (event: Event) => {
      const {position, rotation, feet} = (event as CustomEvent<{feet?: boolean
        position: [number, number, number]
        rotation: [number, number, number, number]}>).detail
      cameraPose.focused = false
      // Gallery navigation describes camera poses; ego-player consistently uses feet.
      const destination = feet ? position : [position[0], Math.max(levelFloorHeight(position) + 0.04, position[1] - 1.6), position[2]] as [number, number, number]
      if (!insideLevel(destination)) {
        return
      }
      player.current?.teleport(destination, rotation)
      // onUpdate checkpoints the resolved physical destination, including any safe-spawn fallback.
    }
    galleryEvents.addEventListener('teleport', teleport)
    return () => {
      galleryEvents.removeEventListener('release-zoom', releaseZoom)
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
  useEffect(() => {
    const pose = playerSession.snapshot()
    galleryEvents.dispatchEvent(new CustomEvent('teleport', {
      detail: {
        feet: true,
        position: pose.position,
        rotation: (new Quaternion).setFromEuler(new Euler(pose.pitch, pose.yaw, 0, 'YXZ')).toArray(),
      },
    }))
  }, [playerEpoch])
  const onUpdate = (state: EgoState) => {
    if (!cameraPose.focused) {
      const {x, y, z} = state.position
      angles.setFromQuaternion(camera.quaternion, 'YXZ')
      playerSession.capture({
        position: [x, y, z],
        yaw: angles.y,
        pitch: angles.x,
      })
    }
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
  return <EgoPlayer ref={player} fallbackPosition={playerSpawn.position} position={initial.position} yaw={initial.yaw} pitch={initial.pitch} input={input} enabled={enabled} cameraEnabled={cameraEnabled} pointerLock={pointerLock} onDump={recordPlayerDump} onInteract={onInteract} onInput={markControlled} onStep={onStep} onUpdate={onUpdate}/>
}
