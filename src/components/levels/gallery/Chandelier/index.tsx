import type {RapierRigidBody} from '@react-three/rapier'

import {BallCollider, ConvexHullCollider, CylinderCollider, RigidBody, useSphericalJoint} from '@react-three/rapier'
import {useEffect, useMemo, useRef} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import ChandelierGeometry from '#src/lib/gallery/ChandelierGeometry.ts'
import {chandelierPhysics, chandelierStemCenter, chandelierStemHalfHeight} from '#src/lib/physics/chandelier.ts'

export default function Chandelier() {
  const anchor = useRef<RapierRigidBody>(null!)
  const fixture = useRef<RapierRigidBody>(null!)
  useSphericalJoint(anchor, fixture, [[0, 0, 0], chandelierPhysics.anchor])
  const brass = useMemo(() => new MeshStandardNodeMaterial({
    color: '#bd924c',
    metalness: 0.88,
    roughness: 0.2,
  }), [])
  const geometry = useMemo(() => new ChandelierGeometry, [])
  useEffect(() => () => {
    brass.dispose()
    geometry.dispose()
  }, [brass, geometry])
  return <group name="sienna-chandelier" position={[0, chandelierPhysics.height, 0]}>
    <RigidBody ref={anchor} type="fixed" colliders={false} position={chandelierPhysics.anchor}/>
    <mesh name="chandelier-canopy" geometry={geometry.canopy} material={brass} castShadow/>
    <RigidBody ref={fixture} colliders={false} ccd canSleep={false} angularDamping={chandelierPhysics.angularDamping} linearDamping={chandelierPhysics.linearDamping} additionalSolverIterations={8}>
      <BallCollider args={[0.21]} mass={chandelierPhysics.hubMass}/>
      <BallCollider args={[0.12]} position={[0, -0.38, 0]} mass={chandelierPhysics.pendantMass}/>
      <CylinderCollider args={[chandelierStemHalfHeight, 0.022]} position={[0, chandelierStemCenter, 0]} mass={chandelierPhysics.stemMass}/>
      {geometry.armColliders.map((vertices, i) => <ConvexHullCollider key={i} args={[vertices]} mass={chandelierPhysics.armMass} restitution={0.15}/>)}
      {geometry.ringColliders.map((vertices, i) => <ConvexHullCollider key={`ring-${i}`} args={[vertices]} mass={chandelierPhysics.ringMass} restitution={0.15}/>)}
      <mesh name="chandelier-brass" geometry={geometry.brass} castShadow><primitive object={brass} attach="material"/></mesh>
      <mesh name="chandelier-candles" geometry={geometry.candles} castShadow><meshStandardNodeMaterial color="#e7c991" roughness={0.65}/></mesh>
      <mesh name="chandelier-flames" geometry={geometry.flames}><meshStandardNodeMaterial color="#fff0b6" emissive="#ffd36c" emissiveIntensity={4} toneMapped={false}/></mesh>
      <mesh name="chandelier-pendant" geometry={geometry.pendant}><primitive object={brass} attach="material"/></mesh>
      {/* Keep the shared light below the metalwork so the fixture cannot shadow its own source. */}
      <pointLight position={[0, -0.6, 0]} color="#ffd36c" intensity={110} distance={13} decay={2} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-near={0.1} shadow-camera-far={13} shadow-normalBias={0.035}/>
    </RigidBody>
  </group>
}
