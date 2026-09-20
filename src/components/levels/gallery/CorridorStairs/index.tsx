import type {Material} from 'three/webgpu'

import {CuboidCollider, RigidBody} from '@react-three/rapier'
import Branch from 'branch-component'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import TimberFrame from '#component/levels/gallery/TimberFrame'
import Box from '#src/components/Scene/primitives.tsx'
import {corridorRails, corridorStairs} from '#src/lib/gallery/corridor.ts'
import TimberGeometry from '#src/lib/gallery/passages/TimberGeometry.ts'
import StairCarpetGeometry from '#src/lib/gallery/stairs/StairCarpetGeometry.ts'
import RoomFloorTextures from '#src/lib/materials/RoomFloorTextures.ts'

export default function CorridorStairs({timber, lining}: {
  lining: Material
  timber: Material
}) {
  const frame = useDisposable(useMemo(() => TimberGeometry.stairs(corridorStairs), []))
  const textures = useDisposable(useMemo(() => new RoomFloorTextures(corridorStairs.width, corridorStairs.run, 1, 1), []))
  const carpet = useDisposable(useMemo(() => new StairCarpetGeometry(corridorStairs.width - 0.5, Math.min(0.38, corridorStairs.run - 0.05)), []))
  const wood = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    ...textures.wood,
    bumpScale: 0.035,
    roughness: 0.64,
    envMapIntensity: 0.2,
  }), [textures]))
  const fabric = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    ...textures.carpet,
    bumpScale: 0.008,
    roughness: 1,
    envMapIntensity: 0,
  }), [textures]))
  return <group name='corridor-wooden-stairs'>
    <RigidBody colliders={false} type='fixed'>
      {corridorStairs.blocks.map((block, i) => <group key={i}>
        <CuboidCollider args={[block.size[0] / 2, block.size[1] / 2, block.size[2] / 2]} position={block.position} />
        <Box material={wood} name='corridor-stair-tread' position={block.position} size={block.size} />
        <Branch if={block.tread}><mesh geometry={carpet} material={fabric} name='corridor-half-round-tread-carpet' position={[block.position[0] + block.size[0] / 2 - 0.025, block.top + 0.001, block.position[2]]} receiveShadow rotation={[0, Math.PI / 2, 0]} /></Branch>
      </group>)}
      <TimberFrame geometry={frame} lining={lining} material={timber} />
      {corridorRails.map((beam, i) => <group key={i} position={beam.position} rotation={beam.rotation}>
        <CuboidCollider args={[beam.size[0] / 2, beam.size[1] / 2, beam.size[2] / 2]} />
        <Box material={timber} size={beam.size} />
      </group>)}
    </RigidBody>
    {[4, 13, 23].map(index => {
      const block = corridorStairs.blocks[index]
      return <group key={index} position={[block.position[0], block.top + 2.5, block.position[2]]}>
        <mesh><sphereGeometry args={[0.08, 12, 8]} /><meshStandardNodeMaterial color='#fff0cb' emissive='#ffd69a' emissiveIntensity={2} /></mesh>
        <pointLight color='#ffdca3' distance={6} intensity={14} />
      </group>
    })}
  </group>
}
