import {useFrame} from '@react-three/fiber'
import {Vector3} from 'three/webgpu'

import {useAmbienceEmitters} from '#src/lib/audio/ambience/ambienceEmitters.ts'
import SoundEngine from '#src/lib/audio/SoundEngine.ts'
import {useGallery} from '#src/lib/gallery.ts'

const forward = new Vector3
const up = new Vector3
const position = new Vector3

/**
 * Hears the world’s positional sounds from the camera: moves the Web Audio listener along with it every frame and starts the ambience emitters once the sound engine exists, which only happens with the player’s first click.
 * Fusions’ portals sound positionally too, so the listener follows even in worlds without ambience.
 */
export default function AmbienceListener() {
  useFrame(({camera}) => {
    const engine = SoundEngine.existing()
    if (!engine) {
      return
    }
    const {emitters} = useAmbienceEmitters.getState()
    const {room} = useGallery.getState()
    for (const emitter of emitters) {
      emitter.setListenerRoom(room)
      emitter.start(engine)
    }
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
