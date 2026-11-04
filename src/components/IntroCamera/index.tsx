import type IntroOrbit from '#src/lib/camera/IntroOrbit.ts'

import {useFrame, useThree} from '@react-three/fiber'
import {defaultEgoOptions} from 'ego-player'
import {useEffect, useRef, useState} from 'react'
import {Euler} from 'three/webgpu'

import {AnimationClock} from '#src/lib/frozenTime.ts'
import {galleryEvents, setCameraFocused} from '#src/lib/gallery.ts'
import {endIntro, hearIntro, introDirection} from '#src/lib/gallery/intro.ts'
import {environmentSeed} from '#src/lib/gameSeed.ts'
import pauseMenu from '#src/lib/pauseMenu.ts'
import {setIntroBlur} from '#src/lib/rendering/playerView.ts'

/** the longest step the orbit takes in one frame, in seconds, so it never jumps after a stalled frame or a hidden tab */
const maxDelta = 0.1
/** the seconds the blur takes to clear once the player has entered */
const blurFade = 0.3

/**
 * Circles the camera on the world’s intro orbit while the first menu shows, one turn a minute, which way the game’s seed decides, with every sound of the world heard from it and the upper and lower thirds of the screen blurred like a full zoom.
 * Once the player enters, the player stands with its eyes right where the camera was, looking the same way, and falls from there while the blur clears, which ends the intro.
 *
 * Mount it after the Player: the player’s own spawn releases the camera on mounting, and the player writes the camera before this does every frame.
 */
export default function IntroCamera({orbit}: {orbit: IntroOrbit}) {
  const camera = useThree(state => state.camera)
  const [clock] = useState(() => new AnimationClock(maxDelta))
  const [rotation] = useState(() => new Euler(0, 0, 0, 'YXZ'))
  const [direction] = useState(() => introDirection(environmentSeed))
  /** how strongly the intro still blurs, or null while the camera still circles */
  const fading = useRef<number>(null)
  useEffect(hearIntro, [])
  useEffect(() => {
    setIntroBlur(1)
    return () => setIntroBlur(0)
  }, [])
  useEffect(() => {
    setCameraFocused(true)
    const enter = () => {
      if (!pauseMenu.getSnapshot().locked || fading.current !== null) {
        return
      }
      // The teleport releases the camera and puts the player there at once, camera included, so the view never moves.
      galleryEvents.dispatchEvent(new CustomEvent('teleport', {
        detail: {
          feet: true,
          position: [camera.position.x, camera.position.y - defaultEgoOptions.eyeHeight, camera.position.z],
          rotation: camera.quaternion.toArray(),
        },
      }))
      fading.current = 1
    }
    return pauseMenu.subscribe(enter)
  }, [camera])
  useFrame((_, delta) => {
    if (fading.current !== null) {
      fading.current = Math.max(0, fading.current - Math.min(delta, maxDelta) / blurFade)
      setIntroBlur(fading.current)
      if (fading.current === 0) {
        endIntro()
      }
      return
    }
    const {position, yaw, pitch} = orbit.pose(clock.advance(delta), direction)
    camera.position.set(...position)
    camera.quaternion.setFromEuler(rotation.set(pitch, yaw, 0))
  })
  return null
}
