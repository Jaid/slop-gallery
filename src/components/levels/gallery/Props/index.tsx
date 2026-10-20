import {knotGeometryArgs} from 'knot-materials/geometry.ts'

import Pedestal, {usePedestal} from '#component/levels/gallery/Pedestal'
import GrabbableProp from '#src/components/Scene/GrabbableProp.tsx'
import Box from '#src/components/Scene/primitives.tsx'
import gold from '#src/lib/materials/gold.ts'

export default function Props() {
  const pedestal = usePedestal()
  return <>
    <Pedestal {...pedestal} position={[11.5, 0, -29]} />
    <GrabbableProp id='prop-knot' position={[11.5, 1.9, -29]} title='A very serious knot'><mesh castShadow material={gold} receiveShadow><torusKnotGeometry args={knotGeometryArgs} /></mesh></GrabbableProp>
    <Pedestal {...pedestal} position={[-14, 0, 1]} />
    <GrabbableProp id='prop-apple' position={[-14, 1.57, 1]} title='The original forbidden download' type='dynamic'>
      <mesh castShadow material={gold} scale={[1, 0.93, 1]}><sphereGeometry args={[0.27, 32, 24]} /></mesh>
      <Box color='#645840' position={[0, 0.3, 0]} size={[0.035, 0.18, 0.04]} />
    </GrabbableProp>
  </>
}
