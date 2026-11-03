import {useFrame} from '@react-three/fiber'
import {useLayoutEffect, useState} from 'react'

import {propObjects} from '#src/components/Scene/GrabbableProp.tsx'
import SoundEngine from '#src/lib/audio/SoundEngine.ts'
import {useGallery} from '#src/lib/gallery.ts'
import {useFusions} from '#src/lib/gallery/fusion/fusions.ts'
import {forcedMood} from '#src/lib/moods/forcedMood.ts'
import {fusionMood} from '#src/lib/moods/index.ts'
import MoodMixer from '#src/lib/moods/MoodMixer.ts'
import {moodSuppression} from '#src/lib/moods/moodSuppression.ts'
import {lightTint, noTint} from '#src/lib/rendering/lightLevels.ts'

/** the mood a prop casts, by its id, if it is one */
const moodOf = (id: string | null) => (id ? propObjects.get(id)?.mood : undefined)

/**
 * Lets a mood come over the world and leave it again: the fusion’s while any fusion’s portal is open, otherwise that of the prop the player holds or views with V until it is let go of or V released, with `?mood` that mood all the time, and none while suppressed with N under `?development`.
 * Its loop sounds once the sound engine exists, which only happens with the player’s first click.
 */
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
    const fusing = useFusions.getState().fusions.length > 0
    const target = moodSuppression.active ? null : forcedMood ?? (fusing ? fusionMood : null) ?? moodOf(held) ?? moodOf(inspecting) ?? null
    mixer.update(target, delta, SoundEngine.existing())
  })
  return null
}
