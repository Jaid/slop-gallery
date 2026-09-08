import type {Vec3} from '#src/lib/gallery.ts'

import GoldMaterial from '#component/GoldMaterial'

import GrabbableProp from './GrabbableProp.tsx'
import Pedestal, {usePedestal} from './Pedestal.tsx'
import {Box} from './primitives.tsx'

export default function Props() {
  const pedestal = usePedestal()
  return <>
    {([
      {
        id: 'prop-book',
        // Clear the 1.35 m cap with the bottom cover, 0.0725 m below the center.
        position: [-3.2, 1.43, 6.8],
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
      <Pedestal {...pedestal} position={[prop.position[0], 0, prop.position[2]]}/>
      <Prop {...prop} position={[...prop.position]}/>
    </group>)}
  </>
}

function Prop({id, position, kind, title}: {id: string
  kind: 'apple' | 'book' | 'knot'
  position: Vec3
  title: string}) {
  return <GrabbableProp id={id} title={title} position={position}>
    {kind === 'knot' ? <mesh castShadow receiveShadow><torusKnotGeometry args={[0.45, 0.13, 256, 48, 2, 3]}/><GoldMaterial/></mesh> : kind === 'apple' ? <group>
      <mesh castShadow scale={[1, 0.93, 1]}><sphereGeometry args={[0.27, 32, 24]}/><meshStandardMaterial color="#bda063" metalness={0.85} roughness={0.24}/></mesh>
      <Box position={[0, 0.3, 0]} size={[0.035, 0.18, 0.04]} color="#645840"/>
    </group> : <group>
      <Box size={[0.64, 0.095, 0.86]} color="#f1dfbd"/>
      <Box size={[0.69, 0.025, 0.91]} position={[0, 0.06, 0]} color="#59684e"/>
      <Box size={[0.69, 0.025, 0.91]} position={[0, -0.06, 0]} color="#59684e"/>
    </group>}
  </GrabbableProp>
}
