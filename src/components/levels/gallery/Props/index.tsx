import {knotGeometryArgs} from 'knot-materials/geometry.ts'

import GoldMaterial from '#component/levels/gallery/GoldMaterial'
import Pedestal, {usePedestal} from '#component/levels/gallery/Pedestal'
import GrabbableProp from '#src/components/Scene/GrabbableProp.tsx'
import Box from '#src/components/Scene/primitives.tsx'

export default function Props() {
  const pedestal = usePedestal()
  return <>
    <Pedestal {...pedestal} position={[13.3, 0, 1.4]} />
    <GrabbableProp id='prop-knot' position={[13.3, 1.9, 1.4]} title='A very serious knot'><mesh castShadow receiveShadow><torusKnotGeometry args={knotGeometryArgs} /><GoldMaterial /></mesh></GrabbableProp>
    <Pedestal {...pedestal} position={[-14, 0, 1]} />
    <GrabbableProp id='prop-apple' position={[-14, 1.57, 1]} title='The original forbidden download' type='dynamic'>
      <mesh castShadow scale={[1, 0.93, 1]}><sphereGeometry args={[0.27, 32, 24]} /><meshStandardNodeMaterial color='#bda063' metalness={0.85} roughness={0.24} /></mesh>
      <Box color='#645840' position={[0, 0.3, 0]} size={[0.035, 0.18, 0.04]} />
    </GrabbableProp>
  </>
}
