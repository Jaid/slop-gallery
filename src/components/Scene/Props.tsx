import type {Vec3} from '#src/lib/gallery.ts'

import {RigidBody} from '@react-three/rapier'

import GrabbableProp from './GrabbableProp.tsx'
import {Box} from './primitives.tsx'

export default function Props() {
  return <>
    {([
      {
        id: 'prop-book',
        position: [-3.2, 1.4, 6.8],
        kind: 'book',
        title: 'A suspiciously well-read book',
      }, {
        id: 'prop-knot',
        position: [13.3, 1.9, 1.4],
        kind: 'knot',
        title: 'A very serious knot',
      }, {
        id: 'prop-apple',
        position: [-14, 1.57, 1],
        kind: 'apple',
        title: 'The original forbidden download',
      },
    ] as const).map(prop => <group key={prop.id}>
      <RigidBody type="fixed" colliders="cuboid"><Box position={[prop.position[0], 0.65, prop.position[2]]} size={[1.1, 1.3, 1.1]} color="#d3c8b2"/><Box position={[prop.position[0], 1.32, prop.position[2]]} size={[1.16, 0.06, 1.16]} color="#e3d7bc"/></RigidBody>
      <Prop {...prop} position={[...prop.position]}/>
    </group>)}
  </>
}

function Prop({id, position, kind, title}: {id: string
  kind: 'apple' | 'book' | 'knot'
  position: Vec3
  title: string}) {
  return <GrabbableProp id={id} title={title} position={position}>
    {kind === 'knot' ? <mesh castShadow><torusKnotGeometry args={[0.45, 0.13, 128, 20, 2, 3]}/><meshStandardMaterial color="#b38957" metalness={0.86} roughness={0.25}/></mesh> : kind === 'apple' ? <group>
      <mesh castShadow scale={[1, 0.93, 1]}><sphereGeometry args={[0.27, 32, 24]}/><meshStandardMaterial color="#bda063" metalness={0.85} roughness={0.24}/></mesh>
      <Box position={[0, 0.3, 0]} size={[0.035, 0.18, 0.04]} color="#645840"/>
    </group> : <group>
      <Box size={[0.64, 0.095, 0.86]} color="#f1dfbd"/>
      <Box size={[0.69, 0.025, 0.91]} position={[0, 0.06, 0]} color="#59684e"/>
      <Box size={[0.69, 0.025, 0.91]} position={[0, -0.06, 0]} color="#59684e"/>
    </group>}
  </GrabbableProp>
}
