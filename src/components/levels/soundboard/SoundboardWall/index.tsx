import type {SoundboardSection} from '#src/lib/audio/SoundboardLayout.ts'
import type {SoundEffect} from '#src/lib/audio/soundEffects.ts'
import type {Group} from 'three/webgpu'

import {useEffect, useRef} from 'react'

import CanvasText from '#component/CanvasText'
import Box from '#src/components/Scene/primitives.tsx'
import {soundboardLayout} from '#src/lib/audio/soundboard.ts'
import {soundboardButton} from '#src/lib/audio/SoundboardLayout.ts'
import {playSoundEffect} from '#src/lib/audio/soundEffects.ts'
import SoundEngine from '#src/lib/audio/SoundEngine.ts'
import {notify} from '#src/lib/gallery/actions.ts'
import {registerInteractiveObject} from '#src/lib/gallery/interactiveObjects.ts'
import {useGallery} from '#src/lib/gallery/store.ts'

const palette: Record<SoundboardSection, {button: string
  heading: string
  label: string}> = {
  enabled: {
    button: '#365f68',
    heading: '#d9f5ed',
    label: '#f4ead2',
  },
  archived: {
    button: '#5a5050',
    heading: '#ead9d6',
    label: '#e2d6ce',
  },
}
const SoundButton = ({effect, index, section}: {effect: SoundEffect
  index: number
  section: SoundboardSection}) => {
  const group = useRef<Group>(null)
  useEffect(() => {
    if (!group.current) {
      return
    }
    const target = {
      group: group.current,
      activate: async () => {
        const muted = !useGallery.getState().sound
        notify(`${effect.id} · ${effect.label}${muted ? ' · audio muted' : ''}`)
        if (muted) {
          return
        }
        const sound = SoundEngine.get()
        try {
          await sound.resume()
          playSoundEffect(sound, effect.id)
        } catch {
          notify(`${effect.id} could not play.`)
        }
      },
    }
    return registerInteractiveObject(effect.id, target)
  }, [effect.id, effect.label])
  const [x, y] = soundboardLayout.buttonPosition(section, index)
  return <group ref={group} name={`soundboard-effect-${effect.id}`} userData={{
    soundEffectId: effect.id,
    soundStatus: section,
  }} position={[x, y, 0.16]}>
    <Box size={[soundboardButton.width, soundboardButton.height, 0.14]} color={palette[section].button} metalness={0.16} roughness={0.4}/>
    <CanvasText position={[0, 0, 0.071]} width={soundboardButton.width - 0.1} height={soundboardButton.height - 0.13} text={`${effect.id} · ${effect.label}`} color={palette[section].label} fontSize={0.48} fontWeight={650}/>
  </group>
}

export default function SoundboardWall({section, effects, position, rotationY}: {effects: ReadonlyArray<SoundEffect>
  position: [number, number, number]
  rotationY: number
  section: SoundboardSection}) {
  const style = palette[section]
  return <group name={`soundboard-${section}-wall`} position={position} rotation={[0, rotationY, 0]}>
    <CanvasText position={[0, soundboardLayout.headingY(), 0.16]} width={Math.min(soundboardLayout.size[0] - 1.2, 5.4)} height={0.58} text={`${section.toUpperCase()} · ${effects.length}`} color={style.heading} fontSize={0.62} fontWeight={750}/>
    {effects.map((effect, index) => <SoundButton key={effect.id} effect={effect} index={index} section={section}/>)}
  </group>
}
