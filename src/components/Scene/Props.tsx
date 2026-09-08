import type {Vec3} from '#src/lib/gallery.ts'

import {RigidBody} from '@react-three/rapier'

import CanvasText from '#component/CanvasText'
import {chime, notify, useGallery} from '#src/lib/gallery.ts'

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
      <CanvasText position={[prop.position[0], 1, prop.position[2] - 0.561]} rotation={[0, Math.PI, 0]} text={prop.kind === 'book' ? 'PLEASE DO NOT READ' : 'PLEASE TOUCH THE ART'} color="#6e654f" width={0.95} height={0.16}/>
    </group>)}
  </>
}

function Prop({id, position, kind, title}: {id: string
  kind: 'apple' | 'book' | 'knot'
  position: Vec3
  title: string}) {
  const onGrab = () => {
    const s = useGallery.getState()
    if (kind === 'book' && !s.secretOpen) {
      s.commit(s.portraits, true)
      useGallery.setState({held: id})
      chime(700)
      notify('A plot twist. The Good Taste Department is now open behind you.')
    }
  }
  return <GrabbableProp id={id} title={title} position={position} onGrab={onGrab}>
    {kind === 'knot' ? <mesh castShadow><torusKnotGeometry args={[0.45, 0.13, 128, 20, 2, 3]}/><meshStandardMaterial color="#b38957" metalness={0.86} roughness={0.25}/></mesh> : kind === 'apple' ? <group>
      <mesh castShadow scale={[1, 0.93, 1]}><sphereGeometry args={[0.27, 32, 24]}/><meshStandardMaterial color="#bda063" metalness={0.85} roughness={0.24}/></mesh>
      <Box position={[0, 0.3, 0]} size={[0.035, 0.18, 0.04]} color="#645840"/>
    </group> : <group>
      <Box size={[0.64, 0.095, 0.86]} color="#f1dfbd"/>
      <Box size={[0.69, 0.025, 0.91]} position={[0, 0.06, 0]} color="#59684e"/>
      <Box size={[0.69, 0.025, 0.91]} position={[0, -0.06, 0]} color="#59684e"/>
      <CanvasText rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.074, 0]} text="GOOD TASTE" width={0.54} height={0.14} color="#dec897"/>
    </group>}
  </GrabbableProp>
}
