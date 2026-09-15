import type {RapierRigidBody} from '@react-three/rapier'

import {BallCollider, ConvexHullCollider, CylinderCollider, RigidBody, useSphericalJoint} from '@react-three/rapier'
import {useEffect, useRef} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import ChandelierGeometry from '#src/lib/gallery/ChandelierGeometry.ts'
import {chandelierPhysics, chandelierStemCenter, chandelierStemHalfHeight} from '#src/lib/physics/chandelier.ts'

export default function Chandelier() {
  const anchor = useRef<RapierRigidBody>(null!)
  const fixture = useRef<RapierRigidBody>(null!)
  useSphericalJoint(anchor, fixture, [[0, 0, 0], chandelierPhysics.anchor])
  const brass = new MeshStandardNodeMaterial({
    color: '#bd924c',
    metalness: 0.88,
    roughness: 0.2,
  })
  const geometry = new ChandelierGeometry
  useEffect(() => () => {
    brass.dispose()
    geometry.dispose()
  }, [brass, geometry])
  return <group name='sienna-chandelier' position={[0, chandelierPhysics.height, 0]}>
    <RigidBody colliders={false} position={chandelierPhysics.anchor} ref={anchor} type='fixed' />
    <mesh castShadow geometry={geometry.canopy} material={brass} name='chandelier-canopy' />
    <RigidBody additionalSolverIterations={8} angularDamping={chandelierPhysics.angularDamping} canSleep={false} ccd colliders={false} linearDamping={chandelierPhysics.linearDamping} ref={fixture}>
      <BallCollider args={[0.21]} mass={chandelierPhysics.hubMass} />
      <BallCollider args={[0.12]} mass={chandelierPhysics.pendantMass} position={[0, -0.38, 0]} />
      <CylinderCollider args={[chandelierStemHalfHeight, 0.022]} mass={chandelierPhysics.stemMass} position={[0, chandelierStemCenter, 0]} />
      {geometry.armColliders.map((vertices, i) => <ConvexHullCollider args={[vertices]} key={i} mass={chandelierPhysics.armMass} restitution={0.15} />)}
      {geometry.ringColliders.map((vertices, i) => <ConvexHullCollider args={[vertices]} key={`ring-${i}`} mass={chandelierPhysics.ringMass} restitution={0.15} />)}
      <mesh castShadow geometry={geometry.brass} name='chandelier-brass'><primitive attach='material' object={brass} /></mesh>
      <mesh castShadow geometry={geometry.candles} name='chandelier-candles'><meshStandardNodeMaterial color='#e7c991' roughness={0.65} /></mesh>
      <mesh geometry={geometry.flames} name='chandelier-flames'><meshStandardNodeMaterial color='#fff0b6' emissive='#ffd36c' emissiveIntensity={4} toneMapped={false} /></mesh>
      <mesh geometry={geometry.pendant} name='chandelier-pendant'><primitive attach='material' object={brass} /></mesh>
      {/* Keep the shared light below the metalwork so the fixture cannot shadow its own source. */}
      <pointLight castShadow color='#ffd36c' decay={2} distance={13} intensity={110} position={[0, -0.6, 0]} shadow-camera-far={13} shadow-camera-near={0.1} shadow-mapSize={[1024, 1024]} shadow-normalBias={0.035} />
    </RigidBody>
  </group>
}
