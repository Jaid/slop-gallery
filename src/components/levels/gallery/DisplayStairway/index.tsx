import type tunnelDisplays from '#src/lib/gallery/tunnelDisplays.ts'
import type {Material} from 'three/webgpu'

import {CuboidCollider, RigidBody} from '@react-three/rapier'

import SlopedBox from '#component/levels/gallery/SlopedBox'
import Box from '#src/components/Scene/primitives.tsx'
import StaticBatch from '#src/components/Scene/StaticBatch.tsx'
import {tunnelSlope} from '#src/lib/gallery/lowerGallery.ts'

type Stairway = (typeof tunnelDisplays)[number]['stairway']

/** the lamps under the ceilings of the vestibule and the landing, which only shine while the player is in the Oculus, the only room that sees the stairway */
const lamp = {
  color: '#a3d2cc',
  decay: 1,
  distance: 12,
  intensity: 16,
  rooms: ['oculus'],
} as const

/** The staff stairway from the Oculus balcony down behind a display, from the vestibule behind its door to the landing that opens into the display’s south end. */
export default function DisplayStairway({stairway, material}: {
  material: Material
  stairway: Stairway
}) {
  const {flight, vestibuleSlabs, floor, ceiling, roof, lamps} = stairway
  return <StaticBatch name={`oculus-stairway-${flight.id}`}>
    {/* StaticBatch hides the originals before automatic colliders would see them, so everything states its colliders. */}
    <RigidBody colliders={false} type='fixed'>
      {flight.blocks.map(({position, size}, i) => <group key={i}>
        <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} position={position} />
        <Box material={material} name='display-stair-block' position={position} size={size} />
      </group>)}
      {vestibuleSlabs.map(({position, size}, i) => <group key={i}>
        <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} position={position} />
        <Box material={material} name={i ? 'display-vestibule-ceiling' : 'display-vestibule-floor'} position={position} size={size} />
      </group>)}
      <group position={roof.position} rotation={roof.rotation}>
        <CuboidCollider args={[roof.size[0] / 2, roof.size[1] / 2, roof.size[2] / 2]} />
        <Box material={material} name='display-stairway-ceiling' size={roof.size} />
      </group>
      <SlopedBox material={material} name='display-landing-floor' position={floor.position} size={floor.size} slope={tunnelSlope} />
      <SlopedBox material={material} name='display-landing-ceiling' position={ceiling.position} size={ceiling.size} slope={tunnelSlope} />
    </RigidBody>
    {flight.blocks.filter(block => block.tread).map(({position, size, top, direction}, i) => <mesh key={i} position={[position[0], top + 0.004, position[2] - direction * (size[2] / 2 - 0.035)]}>
      <boxGeometry args={[size[0] - 0.45, 0.008, 0.025]} />
      <meshBasicNodeMaterial color='#62958e' toneMapped={false} />
    </mesh>)}
    {lamps.map(({position, rotation}, i) => <group key={i} position={position} rotation={rotation}>
      <Box color='#242f32' position={[0, -0.04, 0]} size={[0.5, 0.1, 0.5]} />
      <mesh position={[0, -0.091, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.16, 24]} /><meshBasicNodeMaterial color={lamp.color} toneMapped={false} />
      </mesh>
      <pointLight color={lamp.color} decay={lamp.decay} distance={lamp.distance} intensity={lamp.intensity} position={[0, -0.35, 0]} userData={{rooms: lamp.rooms}} />
    </group>)}
  </StaticBatch>
}
