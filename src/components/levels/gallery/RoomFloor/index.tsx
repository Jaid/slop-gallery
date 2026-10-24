import type {FloorRoom} from '#src/lib/gallery/floors.ts'
import type {Material, Object3D, Texture} from 'three/webgpu'

import {CuboidCollider, RigidBody} from '@react-three/rapier'
import Branch from 'branch-component'
import {useGraphicsModeValue} from 'use-graphics-mode'

import FloorGlass from '#component/levels/gallery/FloorGlass'
import ParquetFloor from '#component/levels/gallery/ParquetFloor'
import WoodFloor from '#component/levels/gallery/WoodFloor'
import Box from '#src/components/Scene/primitives.tsx'
import StaticBatch from '#src/components/Scene/StaticBatch.tsx'
import {floorThickness, roomFloorPlan} from '#src/lib/gallery/floors.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsMode.ts'

/** Materials that replace a room’s default stone slabs and brass inlays. */
export type RoomFloorMaterials = {
  /** the brass inlays; rooms without them leave it out */
  inlay?: Material
  /** the planar reflection target of a reflective slab material, laid at the floor’s surface */
  reflection?: Object3D
  slab: Material
}

export default function RoomFloor({glass, materials, room, stone, wood}: {
  glass: Material
  materials?: RoomFloorMaterials
  room: FloorRoom
  stone: Texture
  wood: Texture
}) {
  const {floorReflections} = useGraphicsModeValue(getGraphicsProfile)
  const plan = roomFloorPlan(room)
  const reflection = materials?.reflection
  const envMapIntensity = floorReflections ? 1 : 0
  const surfaces: Partial<Record<FloorRoom['id'], {
    color: string
    map?: Texture
  }>> = {
    vesper: {
      map: wood,
      color: '#c5a585',
    },
    salon: {color: '#3a2616'},
  }
  const surface = surfaces[room.id] ?? {
    map: stone,
    color: '#f3eddf',
  }
  return <StaticBatch name={`${room.id}-floor`}>
    <RigidBody colliders={false} type='fixed'>
      {plan.slabs.map(({center: [x, z], size: [width, depth]}, i) => <group key={i}>
        <CuboidCollider args={[width / 2, floorThickness / 2, depth / 2]} position={[x, -floorThickness / 2, z]} />
        <Box position={[x, -floorThickness / 2, z]} size={[width, floorThickness, depth]} {...surface} envMapIntensity={envMapIntensity} material={materials?.slab} roughness={floorReflections ? 0.36 : 0.8} />
      </group>)}
      <Branch if={plan.glazing}><FloorGlass glass={glass} glazing={plan.glazing!} name={room.id} /></Branch>
    </RigidBody>
    <Branch if={reflection}><group rotation={[-Math.PI / 2, 0, 0]}><primitive object={reflection!} /></group></Branch>
    <Branch if={room.id === 'vesper'}><WoodFloor depth={room.size[1]} texture={wood} width={room.size[0]} /></Branch>
    <Branch if={room.id === 'salon'}><ParquetFloor depth={room.size[1]} name={room.id} width={room.size[0]} /></Branch>
    <Branch none={[room.id === 'dine', room.id === 'salon']}>
      {plan.seams.map(({center: [x, z], size: [width, depth]}, i) => <Box key={i} color='#a8a18f' envMapIntensity={envMapIntensity} position={[x, 0.008, z]} size={[width, 0.008, depth]} />)}
      {plan.inlays.map(({center: [x, z], size: [width, depth]}, i) => <Box key={i} color='#9d8354' envMapIntensity={envMapIntensity} material={materials?.inlay} metalness={0.45} position={[x, 0.015, z]} size={[width, 0.012, depth]} />)}
    </Branch>
  </StaticBatch>
}
