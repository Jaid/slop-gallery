import type {Texture} from 'three/webgpu'

import {CuboidCollider, RigidBody} from '@react-three/rapier'
import {useEffect, useMemo} from 'react'
import {useGraphicsQualityValue} from 'use-graphics-quality'

import {rooms, walls} from '#src/lib/gallery.ts'
import {RoomFloorTextures} from '#src/lib/materials/RoomFloorTextures.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsQuality.ts'

import BenchSeat from './BenchSeat.tsx'
import Chandelier from './Chandelier.tsx'
import {Box} from './primitives.tsx'

const room = rooms.find(room => room.id === 'amber')!
const rug = [4.8, 7.2] as const

export default function AmberRoom({wood}: {wood: Texture}) {
  const {floorReflections} = useGraphicsQualityValue(getGraphicsProfile)
  const floor = useMemo(() => new RoomFloorTextures(...room.size, ...rug), [])
  useEffect(() => () => floor.dispose(), [floor])
  return <>
    <group position={[room.center[0], 0, room.center[1]]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[room.size[0] / 2, 0.15, room.size[1] / 2]} position={[0, -0.15, 0]}/>
        <CuboidCollider args={[room.size[0] / 2, 0.15, room.size[1] / 2]} position={[0, 5.9, 0]}/>
        <Box position={[0, -0.12, 0]} size={[room.size[0], 0.24, room.size[1]]} color="#392517" envMapIntensity={floorReflections ? 1 : 0}/>
        <Box position={[0, 5.78, 0]} size={[room.size[0], 0.18, room.size[1]]} color="#211b1e"/>
      </RigidBody>
      <mesh name="amber-wood-floor" receiveShadow position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[...room.size]}/>
        <meshStandardNodeMaterial {...floor.wood} bumpScale={0.035} roughness={floorReflections ? 0.55 : 0.72} envMapIntensity={floorReflections ? 1 : 0}/>
      </mesh>
      {[-4, 0, 4].map(x => <Box key={x} position={[x, 5.56, 0]} size={[0.18, 0.3, room.size[1]]} map={wood} color="#493226"/>)}
      <Box position={[0, 0.007, 0]} size={[rug[0], 0.012, rug[1]]} color="#3b1010" roughness={1} envMapIntensity={floorReflections ? 1 : 0}/>
      <mesh name="amber-carpet" receiveShadow position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[...rug]}/>
        <meshStandardNodeMaterial {...floor.carpet} bumpScale={0.008} roughness={1} envMapIntensity={floorReflections ? 1 : 0}/>
      </mesh>
      <RigidBody type="fixed" colliders="cuboid">
        <group position={[-4.1, 0, 1.8]} rotation={[0, Math.PI / 2, 0]}>
          <BenchSeat position={[0, 0.5, 0]} size={[2.6, 0.2, 0.9]}/>
          {[-1, 1].map(x => <Box key={x} position={[x, 0.2, 0]} size={[0.12, 0.4, 0.65]} color="#9f7840" metalness={0.75} roughness={0.28}/>)}
        </group>
      </RigidBody>
      <Chandelier/>
    </group>
    {walls.filter(wall => wall.room === 'amber').map(wall => <group key={wall.id} position={wall.center} rotation={[0, wall.rotation, 0]}>
      {Array.from({length: Math.floor(wall.width / 2)}, (_, i) => i * 2 - wall.width / 2 + 1).filter(u => !wall.holes?.some(hole => Math.abs(u - hole.u) < hole.width / 2 + 1)).map(u => <group key={u} position={[u, 0, 0]}>
        <Box position={[0, 0.92, 0.125]} size={[1.88, 0.94, 0.025]} map={wood} color="#684632" roughness={0.6}/>
        <Box position={[0, 0.92, 0.145]} size={[1.55, 0.65, 0.025]} map={wood} color="#503528" roughness={0.7}/>
        <Box position={[0, 1.42, 0.145]} size={[1.98, 0.045, 0.09]} color="#785b35" metalness={0.4}/>
      </group>)}
    </group>)}
  </>
}
