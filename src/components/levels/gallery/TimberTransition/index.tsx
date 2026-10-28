import type PassageTransition from '#src/lib/gallery/passages/PassageTransition.ts'
import type {Material} from 'three/webgpu'

import {ConvexHullCollider, RigidBody, TrimeshCollider} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'

import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import TransitionGeometry from '#src/lib/gallery/passages/TransitionGeometry.ts'

/** Timber portals, boarding, a raised saddle and planks easing a stone passage into a timber room. The passage floor stays walkable underneath, and the saddle is a low bump to step over. */
export default function TimberTransition({transition, timber, lining, floor}: {
  floor: Material
  lining: Material
  timber: Material
  transition: PassageTransition
}) {
  const geometry = useDisposable(useMemo(() => new TransitionGeometry(transition), [transition]))
  const collision = [geometry.timber, geometry.lining].map(colliderGeometry)
  return <group name={`${transition.passage.id}-timber-transition`}>
    <RigidBody colliders={false} type='fixed'>
      {collision.map((args, i) => <TrimeshCollider key={i} args={args} />)}
      <ConvexHullCollider args={[geometry.sill.getAttribute('position').array]} />
      <mesh castShadow geometry={geometry.timber} material={timber} name='transition-timber' receiveShadow />
      <mesh castShadow geometry={geometry.lining} material={lining} name='transition-boarding' receiveShadow />
      <mesh castShadow geometry={geometry.sill} material={timber} name='transition-sill' receiveShadow />
    </RigidBody>
    <mesh geometry={geometry.planks} material={floor} name='transition-planks' receiveShadow />
  </group>
}
