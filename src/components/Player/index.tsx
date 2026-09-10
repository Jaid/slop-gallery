import type {EgoAction, EgoPlayerHandle, EgoState} from 'ego-player'

import {useKeyboardControls} from '@react-three/drei/webgpu'
import {useThree} from '@react-three/fiber/webgpu'
import EgoPlayer from 'ego-player'
import {useEffect, useRef, useState} from 'react'
import {Euler, Quaternion} from 'three/webgpu'

import {SoundEngine} from '#src/lib/audio/SoundEngine.ts'
import {cameraPose, floorHeight, galleryEvents, markControlled, useGallery} from '#src/lib/gallery.ts'
import {lodgeTunnel} from '#src/lib/gallery/lodge.ts'
import {playerSession, playerSpawn} from '#src/lib/gallery/PlayerSession.ts'
import {playerTelemetry} from '#src/lib/telemetry/index.ts'

const enabled = () => !cameraPose.focused && !useGallery.getState().panel
const cameraEnabled = () => !cameraPose.focused
const pointerLock = {selector: '#pointer-lock-managed-by-gallery'}
const onStep = (state: EgoState) => {
  const {sound, room} = useGallery.getState()
  if (sound) {
    const {x, y, z} = state.position
    const wooden = ['vesper', 'sienna', 'corridor'].includes(room) || room === 'lodge' && !lodgeTunnel.contains([x, y, z])
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
    const teleport = (event: Event) => {
      const {position, rotation, feet} = (event as CustomEvent<{feet?: boolean
        position: [number, number, number]
        rotation: [number, number, number, number]}>).detail
      cameraPose.focused = false
      // Gallery navigation describes camera poses; ego-player consistently uses feet.
      const destination = feet ? position : [position[0], Math.max(floorHeight(position) + 0.04, position[1] - 1.6), position[2]] as [number, number, number]
      player.current?.teleport(destination, rotation)
      // onUpdate checkpoints the resolved physical destination, including any safe-spawn fallback.
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
  return <EgoPlayer ref={player} fallbackPosition={playerSpawn.position} position={initial.position} yaw={initial.yaw} pitch={initial.pitch} input={input} enabled={enabled} cameraEnabled={cameraEnabled} pointerLock={pointerLock} onInput={markControlled} onStep={onStep} onUpdate={onUpdate}/>
}
