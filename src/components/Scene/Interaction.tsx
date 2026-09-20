import type {Placement} from '#src/lib/gallery.ts'
import type {FirstPose, InspectionState} from './interaction/types.ts'
import type {Group} from 'three/webgpu'

import {useThree} from '@react-three/fiber/webgpu'
import Branch from 'branch-component'
import {useRef} from 'react'
import {Raycaster, Vector2, Vector3} from 'three/webgpu'

import {PlacementPreview} from '#level/components.ts'
import {useGallery} from '#src/lib/gallery.ts'
import {isGallery} from '#src/lib/level.ts'

import useInteractionDiagnostics from './interaction/useInteractionDiagnostics.ts'
import useInteractionEvents from './interaction/useInteractionEvents.ts'
import useInteractionFrame from './interaction/useInteractionFrame.ts'

export default function Interaction() {
  const {camera, renderer, controls} = useThree()
  const ghost = useRef<Group>(null)
  const ray = useRef(Object.assign(new Raycaster, {firstHitOnly: true}))
  const placement = useRef<Placement | null>(null)
  const direction = useRef(new Vector3)
  const cursor = useRef(new Vector2)
  const view = useRef<InspectionState | null>(null)
  const previousHeld = useRef<string | null>(null)
  const firstPose = useRef<FirstPose | null>(null)
  const introduced = useRef(false)
  const held = useGallery(s => s.held)
  const artwork = useGallery(s => s.portraits.find(portrait => portrait.id === s.held))
  const dragging = useGallery(s => s.dragging)
  useInteractionEvents({
    camera,
    controls,
    renderer,
    placement,
    view,
    firstPose,
  })
  useInteractionDiagnostics(camera, renderer, placement)
  useInteractionFrame(camera, renderer, {
    cursor,
    direction,
    firstPose,
    ghost,
    introduced,
    placement,
    previousHeld,
    ray,
    view,
  })
  return <group visible={false} ref={ghost}>
    <Branch if={isGallery} some={[artwork, dragging]} not={held?.startsWith('prop-')}><PlacementPreview key={artwork?.id ?? 'import'} creator={artwork?.creator} height={artwork?.height ?? 2.4} pending={artwork?.pending} source={artwork?.source} title={artwork?.title} width={artwork?.width ?? 2.4} /></Branch>
  </group>
}
