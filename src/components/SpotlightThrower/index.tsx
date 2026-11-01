import type {Vec3} from '#src/lib/gallery/types.ts'

import {BallCollider, RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import SpotlightThrowerGeometry, {aimThrower} from '#src/lib/gallery/SpotlightThrowerGeometry.ts'

/** The throwers’ shared geometry and black paint, for any number of them. */
export function useSpotlightThrower() {
  const geometry = useDisposable(useMemo(() => new SpotlightThrowerGeometry, []))
  const paint = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#161618',
    metalness: 0.35,
    roughness: 0.5,
  }), []))
  return {
    geometry,
    paint,
  }
}

/** A spotlight thrower hanging from `ceiling`, a point on the ceiling, its barrel aimed at `target`. It only draws the fixture with its glowing lens: the light is a lamp of its room, shining from in front of the lens, see `aimThrower`. */
export default function SpotlightThrower({ceiling, geometry, paint, target, tint}: ReturnType<typeof useSpotlightThrower> & {
  ceiling: Vec3
  target: Vec3
  /** the glow of its lens, its lamp’s tint */
  tint: string
}) {
  const {pan, pivot, tilt} = useMemo(() => aimThrower(ceiling, target), [ceiling, target])
  // Its own light shines out of the barrel, which would shadow it: only the light of other lamps casts its shadow.
  return <group name='spotlight-thrower' position={pivot} rotation={[0, pan, 0]}>
    <RigidBody colliders={false} type='fixed'>
      <BallCollider args={[0.2]} />
    </RigidBody>
    <mesh geometry={geometry.mount} material={paint} name='spotlight-thrower-mount' receiveShadow />
    <group rotation={[tilt, 0, 0]}>
      <mesh geometry={geometry.barrel} material={paint} name='spotlight-thrower-barrel' receiveShadow />
      <mesh geometry={geometry.lens} name='spotlight-thrower-lens'><meshStandardNodeMaterial color='#fff8ee' emissive={tint} emissiveIntensity={5} toneMapped={false} /></mesh>
    </group>
  </group>
}
