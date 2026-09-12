import type {FloorRoom} from '#src/lib/gallery/floors.ts'
import type {Material, Texture} from 'three/webgpu'

import {CuboidCollider, RigidBody} from '@react-three/rapier'
import Branch from 'branch-component'
import {useMemo} from 'react'
import {useGraphicsQualityValue} from 'use-graphics-quality'

import FloorGlass from '#component/levels/gallery/FloorGlass'
import WoodFloor from '#component/levels/gallery/WoodFloor'
import CheckerMarbleFloor from '#src/components/Scene/CheckerMarbleFloor.tsx'
import Box from '#src/components/Scene/primitives.tsx'
import {floorThickness, roomFloorPlan} from '#src/lib/gallery/floors.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsQuality.ts'

export default function RoomFloor({glass, room, stone, wood}: {glass: Material
  room: FloorRoom
  stone: Texture
  wood: Texture}) {
  const {floorReflections} = useGraphicsQualityValue(getGraphicsProfile)
  const plan = useMemo(() => roomFloorPlan(room), [room])
  const envMapIntensity = floorReflections ? 1 : 0
  const surfaces: Partial<Record<FloorRoom['id'], {color: string
    map?: Texture}>> = {
    vesper: {
      map: wood,
      color: '#c5a585',
    },
    dine: {color: '#23201d'},
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
      <Branch if={plan.glazing}><FloorGlass glass={glass} glazing={plan.glazing!} name={room.id}/></Branch>
    </RigidBody>
    <Branch if={room.id === 'vesper'}><WoodFloor width={room.size[0]} depth={room.size[1]} texture={wood}/></Branch>
    <Branch if={room.id === 'dine'}><CheckerMarbleFloor width={room.size[0]} depth={room.size[1]}/></Branch>
    <Branch if={room.id !== 'dine'}><>
      {plan.seams.map(({center: [x, z], size: [width, depth]}, i) => <Box key={i} position={[x, 0.008, z]} size={[width, 0.008, depth]} color="#a8a18f" envMapIntensity={envMapIntensity}/>)}
      {plan.inlays.map(({center: [x, z], size: [width, depth]}, i) => <Box key={i} position={[x, 0.015, z]} size={[width, 0.012, depth]} color="#9d8354" metalness={0.45} envMapIntensity={envMapIntensity}/>)}
    </></Branch>
  </group>
}
