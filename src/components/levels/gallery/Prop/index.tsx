import type {Vec3} from '#src/lib/gallery.ts'

import GrabbableProp from '#src/components/Scene/GrabbableProp.tsx'
import Box from '#src/components/Scene/primitives.tsx'

export default function Prop({id, position, kind, title}: {
  id: string
  kind: 'apple' | 'book'
  position: Vec3
  title: string
}) {
  return <GrabbableProp id={id} position={position} title={title} type='dynamic'>
    {kind === 'apple' ? <group>
      <mesh castShadow scale={[1, 0.93, 1]}><sphereGeometry args={[0.27, 32, 24]} /><meshStandardNodeMaterial color='#bda063' metalness={0.85} roughness={0.24} /></mesh>
      <Box color='#645840' position={[0, 0.3, 0]} size={[0.035, 0.18, 0.04]} />
    </group> : <group>
      <Box color='#f1dfbd' size={[0.64, 0.095, 0.86]} />
      <Box color='#59684e' position={[0, 0.06, 0]} size={[0.69, 0.025, 0.91]} />
      <Box color='#59684e' position={[0, -0.06, 0]} size={[0.69, 0.025, 0.91]} />
    </group>}
  </GrabbableProp>
}
