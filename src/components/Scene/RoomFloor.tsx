import type {FloorRoom} from '#src/lib/gallery/floors.ts'
import type {Texture} from 'three/webgpu'

import {CuboidCollider, RigidBody} from '@react-three/rapier'
import {useMemo} from 'react'
import {useGraphicsQualityValue} from 'use-graphics-quality'

import {floorGlassThickness, floorThickness, roomFloorPlan} from '#src/lib/gallery/floors.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsQuality.ts'

import CheckerMarbleFloor from './CheckerMarbleFloor.tsx'
import {Box} from './primitives.tsx'
import WoodFloor from './WoodFloor.tsx'

export default function RoomFloor({room, stone, wood}: {room: FloorRoom
  stone: Texture
  wood: Texture}) {
  const {floorReflections} = useGraphicsQualityValue(getGraphicsProfile)
  const plan = useMemo(() => roomFloorPlan(room), [room])
  const envMapIntensity = floorReflections ? 1 : 0
  const surfaces: Partial<Record<FloorRoom['id'], {color: string
    map?: Texture}>> = {
    cabinet: {
      map: wood,
      color: '#c5a585',
    },
    afterhours: {color: '#23201d'},
  }
  const surface = surfaces[room.id] ?? {
    map: stone,
    color: '#f3eddf',
  }
  return <group name={`${room.id}-floor`}>
    <RigidBody type="fixed" colliders={false}>
      {plan.slabs.map(({center: [x, z], size: [width, depth]}, i) => <group key={i}>
        <CuboidCollider args={[width / 2, floorThickness / 2, depth / 2]} position={[x, -floorThickness / 2, z]}/>
        <Box position={[x, -floorThickness / 2, z]} size={[width, floorThickness, depth]} {...surface} roughness={floorReflections ? 0.36 : 0.8} envMapIntensity={envMapIntensity}/>
      </group>)}
      {plan.glazing && <group position={[plan.glazing.center[0], -floorGlassThickness / 2, plan.glazing.center[1]]}>
        <CuboidCollider args={[plan.glazing.size[0] / 2, floorGlassThickness / 2, plan.glazing.size[1] / 2]}/>
        <mesh name={`${room.id}-floor-glass`}>
          <boxGeometry args={[plan.glazing.size[0], floorGlassThickness, plan.glazing.size[1]]}/>
          <meshStandardNodeMaterial color="#a6ced6" transparent opacity={0.32} roughness={0.18} depthWrite={false}/>
        </mesh>
      </group>}
    </RigidBody>
    {room.id === 'cabinet' && <WoodFloor width={room.size[0]} depth={room.size[1]} texture={wood}/>}
    {room.id === 'afterhours' && <CheckerMarbleFloor width={room.size[0]} depth={room.size[1]}/>}
    {room.id !== 'afterhours' && <>
      {plan.seams.map(({center: [x, z], size: [width, depth]}, i) => <Box key={i} position={[x, 0.008, z]} size={[width, 0.008, depth]} color="#a8a18f" envMapIntensity={envMapIntensity}/>)}
      {plan.inlays.map(({center: [x, z], size: [width, depth]}, i) => <Box key={i} position={[x, 0.015, z]} size={[width, 0.012, depth]} color="#9d8354" metalness={0.45} envMapIntensity={envMapIntensity}/>)}
    </>}
  </group>
}
