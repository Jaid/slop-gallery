import type {Vec3} from '#src/lib/gallery/types.ts'
import type {Group} from 'three/webgpu'

import {useEffect, useMemo, useRef} from 'react'

import Box from '#src/components/Scene/primitives.tsx'
import SoundEngine from '#src/lib/audio/SoundEngine.ts'
import {playTemporarySoundEffect, temporarySoundEffects} from '#src/lib/audio/temporarySoundEffects.ts'
import {notify} from '#src/lib/gallery/actions.ts'
import {registerInteractiveObject} from '#src/lib/gallery/interactiveObjects.ts'
import {useGallery} from '#src/lib/gallery/store.ts'
import canvasTexture from '#src/lib/texture.ts'

const columns = 3
const columnPitch = 1.68
const rowPitch = 0.43
const buttonWidth = 1.52
const buttonHeight = 0.34
function Header() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 180
    const context = canvas.getContext('2d')!
    context.fillStyle = '#151719'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillStyle = '#f4ead2'
    context.font = '700 64px system-ui, sans-serif'
    context.fillText('TEMP SFX LAB', canvas.width / 2, 62)
    context.fillStyle = '#b9c8cf'
    context.font = '500 30px system-ui, sans-serif'
    context.fillText('Aim at a button · press E · refer to the SFX ID', canvas.width / 2, 132)
    return canvasTexture(canvas)
  }, [])
  useEffect(() => () => texture.dispose(), [texture])
  return <mesh position={[0, 2.38, 0.075]}>
    <planeGeometry args={[4.88, 0.72]}/><meshBasicNodeMaterial map={texture}/>
  </mesh>
}
function EffectButton({effect, index}: {effect: (typeof temporarySoundEffects)[number]
  index: number}) {
  const group = useRef<Group>(null)
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 128
    const context = canvas.getContext('2d')!
    context.fillStyle = '#24272a'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillStyle = '#f4ead2'
    context.font = '700 34px system-ui, sans-serif'
    context.fillText(effect.id, canvas.width / 2, 38)
    context.fillStyle = '#bdcbd1'
    context.font = '500 27px system-ui, sans-serif'
    context.fillText(effect.label, canvas.width / 2, 91)
    return canvasTexture(canvas)
  }, [effect.id, effect.label])
  useEffect(() => () => texture.dispose(), [texture])
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
          playTemporarySoundEffect(sound, effect.id)
        } catch {
          notify(`${effect.id} could not play.`)
        }
      },
    }
    return registerInteractiveObject(effect.id, target)
  }, [effect.id, effect.label])
  const column = index % columns
  const row = Math.floor(index / columns)
  const x = (column - 1) * columnPitch
  const y = 1.82 - row * rowPitch
  return <group ref={group} name={`temporary-sound-effect-${effect.id}`} position={[x, y, 0.105]}>
    <Box size={[buttonWidth, buttonHeight, 0.12]} color={index % 2 ? '#57636a' : '#665d54'} metalness={0.18} roughness={0.42}/>
    <mesh position={[0, 0, 0.061]}>
      <planeGeometry args={[buttonWidth - 0.08, buttonHeight - 0.07]}/><meshBasicNodeMaterial map={texture}/>
    </mesh>
  </group>
}
/** Temporary in-world audition wall. Remove after the preferred sound IDs are selected. */
function SoundEffectLab({position = [-7.82, 2.75, -26], rotationY = Math.PI / 2}: {position?: Vec3
  rotationY?: number}) {
  return <group name="temporary-sound-effect-lab" position={position} rotation={[0, rotationY, 0]}>
    <Box size={[5.25, 5.3, 0.08]} color="#17191b" metalness={0.12} roughness={0.58}/>
    <Header/>
    {temporarySoundEffects.map((effect, index) => <EffectButton key={effect.id} effect={effect} index={index}/>)}
  </group>
}
export default SoundEffectLab
