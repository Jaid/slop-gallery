import type {Group} from 'three/webgpu'

import {useEffect, useRef} from 'react'

import CanvasText from '#component/CanvasText'
import Box from '#src/components/Scene/primitives.tsx'
import {announcerSamples} from '#src/lib/audio/announcerSamples.ts'
import {narrator} from '#src/lib/audio/narration.ts'
import {soundboardBounds} from '#src/lib/audio/soundboard.ts'
import {notify} from '#src/lib/gallery/actions.ts'
import {registerInteractiveObject} from '#src/lib/gallery/interactiveObjects.ts'
import {useGallery} from '#src/lib/gallery/store.ts'

const button = {
  width: 2.7,
  height: 0.48,
  columnPitch: 2.95,
  rowPitch: 0.72,
} as const
function AnnouncerButton({index}: {index: number}) {
  const sample = announcerSamples[index]
  const group = useRef<Group>(null)
  useEffect(() => {
    if (!group.current) {
      return
    }
    return registerInteractiveObject(`announcer-sample-${sample.id}`, {
      group: group.current,
      activate: () => {
        const muted = !useGallery.getState().sound
        notify(`Announcer · ${sample.label}${muted ? ' · audio muted' : ''}`)
        if (!muted) {
          narrator.push({
            audio: sample.audio,
            text: sample.label,
            title: `Announcer · ${sample.label}`,
          }, {priority: 'destructive'})
        }
      },
    })
  }, [sample])
  const row = Math.floor(index / 3)
  const column = index % 3
  const x = (column - 1) * button.columnPitch
  const y = soundboardBounds.height - 1.65 - row * button.rowPitch
  return <group name={`announcer-sample-${sample.id}`} position={[x, y, 0.16]} ref={group}>
    <Box color='#514e72' metalness={0.12} roughness={0.42} size={[button.width, button.height, 0.14]} />
    <CanvasText color='#f1ecff' fontSize={0.48} fontWeight={650} height={button.height - 0.13} position={[0, 0, 0.071]} text={sample.label} width={button.width - 0.12} />
  </group>
}
function AnnouncerSamples({position, rotationY}: {
  position: [number, number, number]
  rotationY: number
}) {
  return <group name='soundboard-announcer-samples' position={position} rotation={[0, rotationY, 0]}>
    <CanvasText color='#e6dcff' fontSize={0.62} fontWeight={750} height={0.58} position={[0, soundboardBounds.height - 0.62, 0.16]} text={`ANNOUNCER SAMPLES · ${announcerSamples.length}`} width={6.8} />
    {announcerSamples.map((sample, index) => <AnnouncerButton index={index} key={sample.id} />)}
  </group>
}

export default AnnouncerSamples
