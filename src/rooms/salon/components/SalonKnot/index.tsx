import {useThree} from '@react-three/fiber'
import {ConvexHullCollider, useBeforePhysicsStep} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import loadKnotMaterial from 'knot-materials/materials.ts'
import ProgressiveKnotMaterials from 'knot-materials/ProgressiveKnotMaterials.ts'
import {useEffect, useMemo} from 'react'
import useGraphicsMode from 'use-graphics-mode'

import InteractiveObject from '#component/InteractiveObject'
import Pedestal, {usePedestal} from '#component/Pedestal'
import GrabbableProp, {propObjects} from '#src/components/Scene/GrabbableProp.tsx'
import KnotNarration from '#src/lib/audio/KnotNarration.ts'
import {narrator} from '#src/lib/audio/narration.ts'
import {frozenSeconds} from '#src/lib/frozenTime.ts'
import {galleryEvents, narrateModel, useEnvironmentSeed, useGallery} from '#src/lib/gallery.ts'
import showcasedKnots from '#src/lib/gallery/showcasedKnots.ts'
import {trackLoadingItems} from '#src/lib/loadingItems.ts'
import KnotRotation from '#src/lib/physics/KnotRotation.ts'
import {readKnotRotation} from '#src/lib/physics/rotatingKnots.ts'
import {getPmremEnvironment} from '#src/lib/rendering/pmrem.ts'
import salonKnot, {salonKnotPosition} from '#src/rooms/salon/knot.ts'

const isRotating = readKnotRotation()
const [x, , z] = salonKnotPosition

/**
 * The Salon’s Knot, one of the collection’s prime ones the environment’s seed picks, showcased like Knottingham’s: it floats over its pedestal and turns until something knocks it out, only then can it be grabbed, and inspecting it announces its title and its model.
 * Its material and the announcements only load with it.
 */
export default function SalonKnot() {
  const camera = useThree(state => state.camera)
  const renderer = useThree(state => state.renderer)
  const isHeavy = useGraphicsMode()
  const seed = useEnvironmentSeed()
  const entry = useMemo(() => salonKnot(seed), [seed])
  const id = `prop-knot-${entry.id}`
  const pedestal = usePedestal()
  const rotation = useMemo(() => new KnotRotation, [])
  const materials = useDisposable(useMemo(() => new ProgressiveKnotMaterials(renderer, camera, [entry], loadKnotMaterial, isHeavy, getPmremEnvironment()), [camera, entry, isHeavy, renderer]))
  useEffect(() => trackLoadingItems(() => materials.pendingMaterials.map(material => `knot-material:${material}`)), [materials])
  const body = () => propObjects.get(id)?.body
  const outOfShowcase = () => {
    const current = body()
    return current !== undefined && !rotation.isShowcased(current)
  }
  useBeforePhysicsStep(world => {
    if (isRotating) {
      // Under ?frozen_time the Knot stands at the frozen angle.
      if (frozenSeconds === undefined) {
        rotation.advance(world.timestep)
      } else {
        rotation.set(frozenSeconds)
      }
    }
    const current = body()
    if (current) {
      rotation.step(current)
    }
  })
  useEffect(() => {
    showcasedKnots.set(id, {
      id: entry.id,
      name: entry.title,
      position: salonKnotPosition,
      rarity: entry.rarity,
    })
    return () => {
      showcasedKnots.delete(id)
    }
  }, [entry, id])
  // Inspecting the Knot announces it, as does asking for its narration or its model’s; the announcements’ voices only download once the first one plays.
  useEffect(() => {
    const owner = new AbortController
    let announcements: Promise<KnotNarration> | undefined
    const announce = (event: Event, play: (narration: KnotNarration) => void) => {
      if ((event as CustomEvent<string>).detail !== id || !useGallery.getState().sound) {
        return
      }
      announcements ??= import('knot-materials/announcementAssets.ts').then(({default: url}) => new KnotNarration(narrator, url))
      announcements.then(narration => {
        if (!owner.signal.aborted) {
          play(narration)
        }
      }).catch((error: unknown) => {
        console.warn('The Knots’ announcements could not be loaded:', error)
      })
    }
    const inspect = (event: Event) => announce(event, narration => narration.enqueue(entry, {
      id,
      signal: owner.signal,
    }))
    const narrate = (event: Event) => announce(event, narration => narration.enqueue(entry, {
      id,
      repeat: true,
      signal: owner.signal,
    }))
    const model = (event: Event) => announce(event, narration => narration.enqueueModel(entry, {
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
  }, [entry, id])
  const {resources} = materials
  return <group name='salon-knot'>
    <Pedestal {...pedestal} position={[x, 0, z]} />
    {/* The materials hold one slot, for this Knot. */}
    {resources.items.map(({geometry, colliderVertices}, index) => <GrabbableProp key={id} id={id} blockedMessage={() => 'Knock this Knot out of its showcase first.'} canGrab={outOfShowcase} colliders={false} orbit={{radius: geometry.boundingSphere!.radius}} position={salonKnotPosition} recoverAsDynamic={outOfShowcase} title={`${entry.title} · ${entry.modelTitle}`} type='fixed'>
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
    </GrabbableProp>)}
  </group>
}
