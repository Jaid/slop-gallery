import type {KnotEntry} from 'knot-materials'

import {useThree} from '@react-three/fiber'
import {ConvexHullCollider, useBeforePhysicsStep} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {special, unknown} from 'knot-materials'
import {knotExhibition, knotFloatHeight, knotRarityMode} from 'knot-materials/exhibition.ts'
import {createKnotGeometry} from 'knot-materials/geometry.ts'
import loadKnotMaterial from 'knot-materials/materials.ts'
import ProgressiveKnotMaterials from 'knot-materials/ProgressiveKnotMaterials.ts'
import {knotSign, knotSignPosition} from 'knot-materials/signs.ts'
import {useEffect, useMemo, useSyncExternalStore} from 'react'
import useGraphicsMode from 'use-graphics-mode'

import InteractiveObject from '#component/InteractiveObject'
import KnotLabels from '#component/KnotLabels'
import GrabbableProp, {propObjects} from '#src/components/Scene/GrabbableProp.tsx'
import {frozenSeconds} from '#src/lib/frozenTime.ts'
import {narrate, narrateModel, notify} from '#src/lib/gallery/actions.ts'
import {trackLoadingItems} from '#src/lib/loadingItems.ts'
import KnotRotation from '#src/lib/physics/KnotRotation.ts'
import {readKnotRotation} from '#src/lib/physics/rotatingKnots.ts'
import {getPmremEnvironment} from '#src/lib/rendering/pmrem.ts'
import {knotRarityEditor} from '#src/worlds/knottingham/rarity.ts'

const isRotating = readKnotRotation()
const baseRadius = (() => {
  const geometry = createKnotGeometry()
  geometry.computeBoundingSphere()
  const radius = geometry.boundingSphere!.radius
  geometry.dispose()
  return radius
})()
/** every exhibited Knot’s nameplate, beside it and turned in toward its row */
const signs = knotExhibition.map(exhibit => ({
  entry: exhibit,
  position: knotSignPosition(exhibit),
  rotation: exhibit.rotation + knotSign.inwardRotation,
}))
/** E on a nameplate announces its Knot, or with `?rarity=edit` rates it one star higher. */
const activateKnotSign = (entry: Pick<KnotEntry, 'id' | 'title'>) => {
  if (knotRarityMode !== 'edit') {
    narrate(`prop-knot-${entry.id}`)
    return
  }
  const value = knotRarityEditor.cycle(entry.id)
  let rating = `${value}/4 stars`
  if (value === unknown) {
    rating = 'unknown'
  } else if (value === special) {
    rating = 'special, only shown on request'
  }
  notify(`${entry.title}: ${rating}`)
}

export default function KnotExhibition() {
  const camera = useThree(state => state.camera)
  const renderer = useThree(state => state.renderer)
  const isHeavy = useGraphicsMode()
  const ratings = useSyncExternalStore(knotRarityEditor.subscribe, knotRarityEditor.getSnapshot, knotRarityEditor.getSnapshot)
  const rotation = useMemo(() => new KnotRotation, [])
  useBeforePhysicsStep(world => {
    if (isRotating) {
      // Under ?frozen_time the Knots stand at the frozen angle, while physics keeps stepping for whatever moves through the frozen world.
      if (frozenSeconds === undefined) {
        rotation.advance(world.timestep)
      } else {
        rotation.set(frozenSeconds)
      }
    }
    for (const exhibit of knotExhibition) {
      const body = propObjects.get(`prop-knot-${exhibit.id}`)?.body
      if (body) {
        rotation.step(body)
      }
    }
  })
  useEffect(() => {
    globalThis.slopGallery ??= {}
    const gallery = globalThis.slopGallery
    const reset = () => rotation.reset()
    gallery.resetKnotRotation = reset
    return () => {
      if (gallery.resetKnotRotation === reset) {
        delete gallery.resetKnotRotation
      }
    }
  }, [rotation])
  const materials = useDisposable(useMemo(() => new ProgressiveKnotMaterials(renderer, camera, knotExhibition, loadKnotMaterial, isHeavy, getPmremEnvironment()), [camera, isHeavy, renderer]))
  useEffect(() => trackLoadingItems(() => materials.pendingMaterials.map(id => `knot-material:${id}`)), [materials])
  const {resources} = materials
  return <group name='lobby-knot-exhibition'>
    <KnotLabels action={knotRarityMode === 'edit' ? 'Rate' : 'Listen'} ratings={ratings} signs={signs} onActivate={activateKnotSign} />
    {knotExhibition.map((finish, index) => {
      const {geometry, colliderVertices} = resources.items[index]
      const id = `prop-knot-${finish.id}`
      const body = () => propObjects.get(id)?.body
      const outOfShowcase = () => {
        const current = body()
        return current !== undefined && !rotation.isShowcased(current)
      }
      return <GrabbableProp
        key={finish.id} id={id} blockedMessage={() => 'Knock this Knot out of its showcase first.'} canGrab={outOfShowcase} colliders={false} orbit={{radius: baseRadius + (finish.displacement ?? 0)}} position={[finish.position[0], knotFloatHeight, finish.position[2]]} recoverAsDynamic={outOfShowcase} rotation={[0, finish.rotation, 0]} title={`${finish.label} · ${finish.title} · ${finish.modelTitle}`} type='fixed'
      >
        <ConvexHullCollider
          args={[colliderVertices]} contactSkin={finish.displacement ?? 0} onContactForce={({target}) => {
            if (target.rigidBody) {
              rotation.release(target.rigidBody)
            }
          }}
        />
        <InteractiveObject id={id} action='Listen' inspectable title={finish.title} onActivate={() => narrateModel(id)}>
          <mesh castShadow material={materials.placeholderMaterials[index]} name={`knot-${finish.id}`} raycast={resources.raycast} receiveShadow ref={materials.refs[index]} onBeforeRender={materials.observers[index]}>
            <primitive attach='geometry' object={geometry} />
          </mesh>
        </InteractiveObject>
      </GrabbableProp>
    })}
  </group>
}
