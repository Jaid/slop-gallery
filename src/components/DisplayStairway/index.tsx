import type tunnelDisplays from '#src/lib/gallery/tunnelDisplays.ts'
import type {Vec3} from '#src/lib/gallery/types.ts'
import type {Material} from 'three/webgpu'

import {CuboidCollider, RigidBody} from '@react-three/rapier'

import Box from '#src/components/Scene/primitives.tsx'
import StaticBatch from '#src/components/Scene/StaticBatch.tsx'
import {stairwayTint} from '#src/rooms/exhibition/lamps.ts'

type Stairway = (typeof tunnelDisplays)[number]['stairway']

/** The staff stairway from a door at the Oculus balcony’s end down to the landing before the cutout in a display’s south end wall. */
export default function DisplayStairway({stairway, material}: {
  material: Material
  stairway: Stairway
}) {
  const {id, treads, slabs, roofs, lamps} = stairway
  return <StaticBatch name={`oculus-stairway-${id}`}>
    {/* StaticBatch hides the originals before automatic colliders would see them, so everything states its colliders. */}
    <RigidBody colliders={false} type='fixed'>
      {treads.map(({position, size}, i) => <group key={i}>
        <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} position={position} />
        <Box material={material} name='display-stair-block' position={position} size={size} />
      </group>)}
      {slabs.map(({name, position, rotation, size}, i) => <group key={i} position={position} rotation={rotation}>
        <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} />
        <Box material={material} name={name} size={size} />
      </group>)}
      {roofs.map(({position, rotation, size}, i) => <group key={i} position={position} rotation={rotation}>
        <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} />
        <Box material={material} name='display-stairway-roof' size={size} />
      </group>)}
    </RigidBody>
    {treads.filter(block => block.tread).map(({axis, position, size, top, direction}, i) => {
      // a strip along the tread’s edge at the riser up
      const along = axis === 0 ? 0 : 2
      const stripPosition: Vec3 = [position[0], top + 0.004, position[2]]
      stripPosition[along] -= direction * (size[along] / 2 - 0.035)
      const stripSize: Vec3 = [0.025, 0.008, 0.025]
      stripSize[2 - along] = size[2 - along] - 0.45
      return <mesh key={i} position={stripPosition}>
        <boxGeometry args={stripSize} />
        <meshBasicNodeMaterial color='#62958e' toneMapped={false} />
      </mesh>
    })}
    {lamps.map((position, i) => <group key={i} position={position}>
      <Box color='#242f32' position={[0, -0.04, 0]} size={[0.5, 0.1, 0.5]} />
      <mesh position={[0, -0.091, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.16, 24]} /><meshBasicNodeMaterial color={stairwayTint} toneMapped={false} />
      </mesh>
    </group>)}
  </StaticBatch>
}
