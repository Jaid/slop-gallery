import type {EgoAction, EgoPlayerHandle, EgoState} from 'ego-player'

import {useKeyboardControls} from '@react-three/drei/webgpu'
import {useThree} from '@react-three/fiber'
import EgoPlayer from 'ego-player'
import {useEffect, useRef, useState} from 'react'
import {Euler, Quaternion, Vector3} from 'three/webgpu'

import {insideLevel, levelFloorHeight} from '#level/navigation.ts'
import {attachPlayerAudio, onPlayerLand, onPlayerStep, onPlayerZoomChange, onPlayerZoomTransition} from '#src/lib/audio/playerAudio.ts'
import {cameraPose, galleryEvents, markControlled, narrate, setCameraFocused, useGallery} from '#src/lib/gallery.ts'
import {findSpawnBookmark} from '#src/lib/gallery/bookmarks.ts'
import {flyMode} from '#src/lib/gallery/flyMode.ts'
import {activateInteractiveObject} from '#src/lib/gallery/interactiveObjects.ts'
import {playerSession, playerSpawn} from '#src/lib/gallery/PlayerSession.ts'
import portraitObjects from '#src/lib/gallery/portraitObjects.ts'
import {playerTelemetry} from '#src/lib/telemetry/index.ts'
import {playerDumpHandler, playerDumps, snapshotPlayerDump} from '#src/lib/telemetry/recordPlayerDump.ts'

const enabled = () => !cameraPose.focused && !useGallery.getState().panel
const cameraEnabled = () => !cameraPose.focused
const flying = () => flyMode.active
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
export default function Player() {
  useEffect(attachPlayerAudio, [])
  const player = useRef<EgoPlayerHandle>(null)
  const input = useKeyboardControls<EgoAction>()[1]
  const camera = useThree(s => s.camera)
  const [initial] = useState(() => playerSession.snapshot())
  const [angles] = useState(() => new Euler(0, 0, 0, 'YXZ'))
  const playerEpoch = useGallery(s => s.playerEpoch)
  // where a ?spawn bookmark with an eye height holds the camera, until the next teleport
  const heldCamera = useRef<{
    position: Vector3
    quaternion: Quaternion
  } | null>(null)
  useEffect(() => {
    const read = () => player.current?.getState() ?? null
    playerTelemetry.read = read
    const capture = () => player.current?.dump() ?? null
    playerDumps.capture = capture
    const dump = () => {
      const captured = capture()
      return captured ? snapshotPlayerDump(captured) : null
    }
    globalThis.slopGallery ??= {}
    globalThis.slopGallery.dump = dump
    const releaseZoom = () => player.current?.releaseZoom()
    galleryEvents.addEventListener('release-zoom', releaseZoom)
    const teleport = (event: Event) => {
      const {position, rotation, feet} = (event as CustomEvent<{
        feet?: boolean
        position: [number, number, number]
        rotation: [number, number, number, number]
      }>).detail
      setCameraFocused(false)
      heldCamera.current = null
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
      if (playerDumps.capture === capture) {
        playerDumps.capture = null
      }
      const diagnostics = globalThis.slopGallery
      if (diagnostics) {
        delete diagnostics.player
        if (diagnostics.dump === dump) {
          delete diagnostics.dump
        }
      }
    }
  }, [])
  useEffect(() => {
    const pose = playerSession.snapshot()
    const sessionRotation = new Quaternion
    galleryEvents.dispatchEvent(new CustomEvent('teleport', {
      detail: {
        feet: true,
        position: pose.position,
        rotation: sessionRotation.setFromEuler(new Euler(pose.pitch, pose.yaw, 0, 'YXZ')).toArray(),
      },
    }))
    const bookmark = findSpawnBookmark()
    // The teleport above released the camera; a ?spawn bookmark with an eye height takes it again while the player still stands at the bookmark.
    if (bookmark?.eyeHeight !== undefined && bookmark.position.every((value, index) => value === pose.position[index])) {
      setCameraFocused(true)
      heldCamera.current = {
        position: new Vector3(pose.position[0], pose.position[1] + bookmark.eyeHeight, pose.position[2]),
        quaternion: sessionRotation,
      }
    }
  }, [playerEpoch])
  const onUpdate = (state: EgoState) => {
    // The player applies the teleport, camera included, on its next frame, so the held camera is set after every update.
    if (heldCamera.current) {
      camera.position.copy(heldCamera.current.position)
      camera.quaternion.copy(heldCamera.current.quaternion)
    }
    if (!cameraPose.focused) {
      const {x, y, z} = state.position
      angles.setFromQuaternion(camera.quaternion, 'YXZ')
      playerSession.capture({
        position: [x, y, z],
        yaw: angles.y,
        pitch: angles.x,
      })
    }
    const diagnostics = globalThis.slopGallery
    if (diagnostics) {
      diagnostics.player = {
        keys: input(),
        position: state.position,
        enabled: true,
        grounded: state.grounded,
      }
    }
  }
  return <EgoPlayer cameraEnabled={cameraEnabled} enabled={enabled} fallbackPosition={playerSpawn.position} flying={flying} input={input} pitch={initial.pitch} pointerLock={pointerLock} position={initial.position} yaw={initial.yaw} ref={player} onDump={playerDumpHandler} onInput={markControlled} onInteract={onInteract} onLand={onPlayerLand} onStep={onPlayerStep} onUpdate={onUpdate} onZoomChange={onPlayerZoomChange} onZoomTransition={onPlayerZoomTransition} />
}
