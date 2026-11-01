import {useFrame} from '@react-three/fiber'
import {useLayoutEffect, useState} from 'react'

import {propObjects} from '#src/components/Scene/GrabbableProp.tsx'
import SoundEngine from '#src/lib/audio/SoundEngine.ts'
import {useGallery} from '#src/lib/gallery.ts'
import {forcedMood} from '#src/lib/moods/forcedMood.ts'
import MoodMixer from '#src/lib/moods/MoodMixer.ts'
import {lightTint, noTint} from '#src/lib/rendering/lightLevels.ts'

/** the mood a prop casts, by its id, if it is one */
const moodOf = (id: string | null) => (id ? propObjects.get(id)?.mood : undefined)

/** Lets the mood of the prop the player holds or views with V come over the world, and leave it once the prop is let go of or V released, with `?mood` that mood all the time. Its loop sounds once the sound engine exists, which only happens with the player’s first click. */
export default function Moods() {
  const [mixer] = useState(() => new MoodMixer)
  useLayoutEffect(() => {
    lightTint.current = light => mixer.tintOf(light)
    return () => {
      lightTint.current = () => noTint
      mixer.dispose()
    }
  }, [mixer])
  useFrame((_, delta) => {
    const {held, inspecting} = useGallery.getState()
    const target = forcedMood ?? moodOf(held) ?? moodOf(inspecting) ?? null
    mixer.update(target, delta, SoundEngine.existing())
  })
  return null
}
