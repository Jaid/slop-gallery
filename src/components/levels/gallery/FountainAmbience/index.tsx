import {useFrame} from '@react-three/fiber'
import {useEffect, useRef} from 'react'
import {Vector3} from 'three/webgpu'

import FountainAmbience from '#src/lib/audio/fountainAmbience.ts'
import SoundEngine from '#src/lib/audio/SoundEngine.ts'
import {useGallery} from '#src/lib/gallery.ts'
import fountain from '#src/lib/gallery/fountain/config.ts'

const forward = new Vector3
const up = new Vector3
const position = new Vector3

/**
 * Plays the fountain’s water from its spray, heard from wherever the camera is. Waits for the sound engine, which only starts with the player’s first click.
 */
export default function FountainAmbienceSound() {
  const ambience = useRef<FountainAmbience>(null)
  useEffect(() => () => {
    ambience.current?.dispose()
    ambience.current = null
  }, [])
  useFrame(({camera}) => {
    const engine = SoundEngine.existing()
    if (!engine) {
      return
    }
    ambience.current ??= new FountainAmbience(engine.context, engine.master, [fountain.position[0], fountain.position[1] + 1.2, fountain.position[2]])
    ambience.current.setInside(useGallery.getState().room === 'lobby')
    const {listener} = engine.context
    camera.getWorldPosition(position)
    camera.getWorldDirection(forward)
    up.setFromMatrixColumn(camera.matrixWorld, 1)
    listener.positionX.value = position.x
    listener.positionY.value = position.y
    listener.positionZ.value = position.z
    listener.forwardX.value = forward.x
    listener.forwardY.value = forward.y
    listener.forwardZ.value = forward.z
    listener.upX.value = up.x
    listener.upY.value = up.y
    listener.upZ.value = up.z
  })
  return null
}
