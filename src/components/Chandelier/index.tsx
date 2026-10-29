import type {RapierRigidBody} from '@react-three/rapier'
import type {Object3D} from 'three/webgpu'

import {useFrame} from '@react-three/fiber'
import {BallCollider, ConvexHullCollider, CylinderCollider, RigidBody, useSphericalJoint} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo, useRef} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import ChandelierGeometry from '#src/lib/gallery/ChandelierGeometry.ts'
import {chandelierLampY, chandelierPhysics, chandelierStemCenter, chandelierStemHalfHeight} from '#src/lib/physics/chandelier.ts'
import {useLamp} from '#src/lib/rendering/lamps.ts'

/** The Sienna’s swinging chandelier, which carries the room’s lamp along. */
export default function Chandelier() {
  const anchor = useRef<RapierRigidBody>(null!)
  const fixture = useRef<RapierRigidBody>(null!)
  useSphericalJoint(anchor, fixture, [[0, 0, 0], chandelierPhysics.anchor])
  const brass = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#bd924c',
    metalness: 0.88,
    roughness: 0.2,
  }), []))
  const geometry = useDisposable(useMemo(() => new ChandelierGeometry, []))
  const source = useRef<Object3D>(null)
  const lamp = useLamp('sienna-chandelier')
  useFrame(() => {
    const light = lamp()
    if (light && source.current) {
      source.current.updateWorldMatrix(true, false)
      source.current.getWorldPosition(light.position)
    }
  })
  return <group name='sienna-chandelier' position={[0, chandelierPhysics.height, 0]}>
    <RigidBody colliders={false} position={chandelierPhysics.anchor} type='fixed' ref={anchor} />
    <mesh castShadow geometry={geometry.canopy} material={brass} name='chandelier-canopy' />
    <RigidBody additionalSolverIterations={8} angularDamping={chandelierPhysics.angularDamping} canSleep={false} ccd colliders={false} linearDamping={chandelierPhysics.linearDamping} ref={fixture}>
      <BallCollider args={[0.21]} mass={chandelierPhysics.hubMass} />
      <BallCollider args={[0.12]} mass={chandelierPhysics.pendantMass} position={[0, -0.38, 0]} />
      <CylinderCollider args={[chandelierStemHalfHeight, 0.022]} mass={chandelierPhysics.stemMass} position={[0, chandelierStemCenter, 0]} />
      {geometry.armColliders.map((vertices, i) => <ConvexHullCollider key={i} args={[vertices]} mass={chandelierPhysics.armMass} restitution={0.15} />)}
      {geometry.ringColliders.map((vertices, i) => <ConvexHullCollider key={`ring-${i}`} args={[vertices]} mass={chandelierPhysics.ringMass} restitution={0.15} />)}
      <mesh castShadow geometry={geometry.brass} name='chandelier-brass'><primitive attach='material' object={brass} /></mesh>
      <mesh castShadow geometry={geometry.candles} name='chandelier-candles'><meshStandardNodeMaterial color='#e7c991' roughness={0.65} /></mesh>
      <mesh geometry={geometry.flames} name='chandelier-flames'><meshStandardNodeMaterial color='#fff0b6' emissive='#ffd36c' emissiveIntensity={4} toneMapped={false} /></mesh>
      <mesh geometry={geometry.pendant} name='chandelier-pendant'><primitive attach='material' object={brass} /></mesh>
      {/* The lamp hangs below the metalwork, so the fixture cannot shadow its own source. */}
      <object3D position={[0, chandelierLampY - chandelierPhysics.height, 0]} ref={source} />
    </RigidBody>
  </group>
}
