import type {ShowcasedKnot} from '#src/lib/gallery/showcasedKnots.ts'

import {useThree} from '@react-three/fiber'
import {ConvexHullCollider, useBeforePhysicsStep} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import loadKnotMaterial from 'knot-materials/materials.ts'
import ProgressiveKnotMaterials from 'knot-materials/ProgressiveKnotMaterials.ts'
import {useEffect, useMemo} from 'react'
import useGraphicsMode from 'use-graphics-mode'

import InteractiveObject from '#component/InteractiveObject'
import GrabbableProp, {propObjects} from '#src/components/Scene/GrabbableProp.tsx'
import KnotNarration from '#src/lib/audio/KnotNarration.ts'
import {narrator} from '#src/lib/audio/narration.ts'
import {frozenSeconds} from '#src/lib/frozenTime.ts'
import {galleryEvents, narrateModel, useGallery} from '#src/lib/gallery.ts'
import showcasedKnots from '#src/lib/gallery/showcasedKnots.ts'
import {trackLoadingItems} from '#src/lib/loadingItems.ts'
import KnotRotation from '#src/lib/physics/KnotRotation.ts'
import {readKnotRotation} from '#src/lib/physics/rotatingKnots.ts'
import {getPmremEnvironment} from '#src/lib/rendering/pmrem.ts'

const isRotating = readKnotRotation()
const propId = ({entry}: ShowcasedKnot) => `prop-knot-${entry.id}`

/**
 * Knots the gallery showcases like Knottingham’s: each floats and turns until something knocks it out, only then can it be grabbed, and inspecting it announces its title and its model.
 * Their materials and the announcements only load with them. `knots` must keep its identity while it stays the same, since a new one builds every material anew.
 */
export default function KnotShowcase({knots}: {knots: ReadonlyArray<ShowcasedKnot>}) {
  const camera = useThree(state => state.camera)
  const renderer = useThree(state => state.renderer)
  const isHeavy = useGraphicsMode()
  const rotation = useMemo(() => new KnotRotation, [])
  const materials = useDisposable(useMemo(() => new ProgressiveKnotMaterials(renderer, camera, knots.map(knot => knot.entry), loadKnotMaterial, isHeavy, getPmremEnvironment()), [camera, isHeavy, knots, renderer]))
  useEffect(() => trackLoadingItems(() => materials.pendingMaterials.map(material => `knot-material:${material}`)), [materials])
  const outOfShowcase = (id: string) => {
    const body = propObjects.get(id)?.body
    return body !== undefined && !rotation.isShowcased(body)
  }
  useBeforePhysicsStep(world => {
    if (isRotating) {
      // Under ?frozen_time the Knots stand at the frozen angle.
      if (frozenSeconds === undefined) {
        rotation.advance(world.timestep)
      } else {
        rotation.set(frozenSeconds)
      }
    }
    for (const knot of knots) {
      const body = propObjects.get(propId(knot))?.body
      if (body) {
        rotation.step(body)
      }
    }
  })
  useEffect(() => {
    const ids = knots.map(knot => {
      const id = propId(knot)
      showcasedKnots.set(id, {
        id: knot.entry.id,
        name: knot.entry.title,
        position: knot.position,
        rarity: knot.entry.rarity,
      })
      return id
    })
    return () => {
      for (const id of ids) {
        showcasedKnots.delete(id)
      }
    }
  }, [knots])
  // Inspecting a Knot announces it, as does asking for its narration or its model’s; the announcements’ voices only download once the first one plays.
  useEffect(() => {
    const owner = new AbortController
    const entries = new Map(knots.map(knot => [propId(knot), knot.entry]))
    let announcements: Promise<KnotNarration> | undefined
    const announce = (event: Event, play: (narration: KnotNarration, id: string, entry: ShowcasedKnot['entry']) => void) => {
      const id = (event as CustomEvent<string>).detail
      const entry = entries.get(id)
      if (!entry || !useGallery.getState().sound) {
        return
      }
      announcements ??= import('knot-materials/announcementAssets.ts').then(({default: url}) => new KnotNarration(narrator, url))
      announcements.then(narration => {
        if (!owner.signal.aborted) {
          play(narration, id, entry)
        }
      }).catch((error: unknown) => {
        console.warn('The Knots’ announcements could not be loaded:', error)
      })
    }
    const inspect = (event: Event) => announce(event, (narration, id, entry) => narration.enqueue(entry, {
      id,
      signal: owner.signal,
    }))
    const narrate = (event: Event) => announce(event, (narration, id, entry) => narration.enqueue(entry, {
      id,
      repeat: true,
      signal: owner.signal,
    }))
    const model = (event: Event) => announce(event, (narration, id, entry) => narration.enqueueModel(entry, {
      id,
      signal: owner.signal,
    }))
    galleryEvents.addEventListener('inspect', inspect)
    galleryEvents.addEventListener('narrate', narrate)
    galleryEvents.addEventListener('narrate-model', model)
    return () => {
      galleryEvents.removeEventListener('inspect', inspect)
      galleryEvents.removeEventListener('narrate', narrate)
      galleryEvents.removeEventListener('narrate-model', model)
      owner.abort()
    }
  }, [knots])
  const {resources} = materials
  return <>
    {knots.map((knot, index) => {
      const {entry, position, rotation: yaw = 0} = knot
      const {geometry, colliderVertices} = resources.items[index]
      const id = propId(knot)
      return <GrabbableProp key={id} id={id} blockedMessage={() => 'Knock this Knot out of its showcase first.'} canGrab={() => outOfShowcase(id)} colliders={false} orbit={{radius: geometry.boundingSphere!.radius}} position={position} recoverAsDynamic={() => outOfShowcase(id)} rotation={[0, yaw, 0]} title={`${entry.title} · ${entry.modelTitle}`} type='fixed'>
        <ConvexHullCollider
          args={[colliderVertices]} contactSkin={entry.displacement ?? 0} onContactForce={({target}) => {
            if (target.rigidBody) {
              rotation.release(target.rigidBody)
            }
          }}
        />
        <InteractiveObject id={id} action='Listen' inspectable title={entry.title} onActivate={() => narrateModel(id)}>
          <mesh castShadow material={materials.placeholderMaterials[index]} name={`knot-${entry.id}`} raycast={resources.raycast} receiveShadow ref={materials.refs[index]} onBeforeRender={materials.observers[index]}>
            <primitive attach='geometry' object={geometry} />
          </mesh>
        </InteractiveObject>
      </GrabbableProp>
    })}
  </>
}
