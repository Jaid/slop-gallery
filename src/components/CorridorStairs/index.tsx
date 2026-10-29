import type {Material} from 'three/webgpu'

import {CuboidCollider, RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'

import TimberFrame from '#component/TimberFrame'
import Box from '#src/components/Scene/primitives.tsx'
import StaticBatch from '#src/components/Scene/StaticBatch.tsx'
import {corridorRails, corridorRunner, corridorStairs} from '#src/lib/gallery/corridor.ts'
import TimberGeometry from '#src/lib/gallery/passages/TimberGeometry.ts'
import {lightIndoors} from '#src/lib/materials/lights/index.ts'
import StairRunnerMaterial from '#src/lib/materials/StairRunnerMaterial.ts'

/** The flight from the corridor up to Sienna. Its materials must be lit by {@link lightIndoors}, like the treads. */
export default function CorridorStairs({timber, lining}: {
  lining: Material
  timber: Material
}) {
  const frame = useDisposable(useMemo(() => TimberGeometry.stairs(corridorStairs), []))
  // The runner, rods and nosings are shaded into the treads, so every step stays a single box.
  const treads = useDisposable(useMemo(() => lightIndoors(new StairRunnerMaterial(corridorRunner)), []))
  return <StaticBatch name='corridor-wooden-stairs'>
    <RigidBody colliders={false} type='fixed'>
      {corridorStairs.blocks.map((block, i) => <group key={i}>
        <CuboidCollider args={[block.size[0] / 2, block.size[1] / 2, block.size[2] / 2]} position={block.position} />
        <Box material={treads} name='corridor-stair-tread' position={block.position} size={block.size} />
      </group>)}
      <TimberFrame geometry={frame} lining={lining} material={timber} />
      {corridorRails.map((beam, i) => <group key={i} position={beam.position} rotation={beam.rotation}>
        <CuboidCollider args={[beam.size[0] / 2, beam.size[1] / 2, beam.size[2] / 2]} />
        <Box material={timber} size={beam.size} />
      </group>)}
    </RigidBody>
  </StaticBatch>
}
