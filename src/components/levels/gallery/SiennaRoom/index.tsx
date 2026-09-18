import type {Texture} from 'three/webgpu'

import {CuboidCollider, RigidBody} from '@react-three/rapier'
import {useEffect} from 'react'
import {useGraphicsQualityValue} from 'use-graphics-quality'

import Chandelier from '#component/levels/gallery/Chandelier'
import Box from '#src/components/Scene/primitives.tsx'
import {rooms, useGallery, walls} from '#src/lib/gallery.ts'
import {siennaRugSize} from '#src/lib/gallery/sienna.ts'
import RoomFloorTextures from '#src/lib/materials/RoomFloorTextures.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsQuality.ts'

const room = rooms.find(candidate => candidate.id === 'sienna')!

export default function SiennaRoom({wood}: {wood: Texture}) {
  const resetEpoch = useGallery(s => s.resetEpoch)
  const {floorReflections} = useGraphicsQualityValue(getGraphicsProfile)
  const floor = new RoomFloorTextures(...room.size, ...siennaRugSize)
  useEffect(() => () => floor.dispose(), [floor])
  return <>
    <group position={[room.center[0], 0, room.center[1]]}>
      <RigidBody colliders={false} type='fixed'>
        <CuboidCollider args={[room.size[0] / 2, 0.15, room.size[1] / 2]} position={[0, -0.15, 0]} />
        <CuboidCollider args={[room.size[0] / 2, 0.15, room.size[1] / 2]} position={[0, 5.9, 0]} />
        <Box color='#392517' envMapIntensity={floorReflections ? 1 : 0} position={[0, -0.12, 0]} size={[room.size[0], 0.24, room.size[1]]} />
        <Box color='#211b1e' position={[0, 5.78, 0]} size={[room.size[0], 0.18, room.size[1]]} />
      </RigidBody>
      <mesh name='sienna-wood-floor' position={[0, 0.001, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[...room.size]} />
        <meshStandardNodeMaterial {...floor.wood} bumpScale={0.035} envMapIntensity={floorReflections ? 1 : 0} roughness={floorReflections ? 0.55 : 0.72} />
      </mesh>
      {[-4, 0, 4].map(x => <Box key={x} color='#493226' map={wood} position={[x, 5.56, 0]} size={[0.18, 0.3, room.size[1]]} />)}
      <Box color='#3b1010' envMapIntensity={floorReflections ? 1 : 0} position={[0, 0.007, 0]} roughness={1} size={[siennaRugSize[0], 0.012, siennaRugSize[1]]} />
      <mesh name='sienna-carpet' position={[0, 0.014, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[...siennaRugSize]} />
        <meshStandardNodeMaterial {...floor.carpet} bumpScale={0.008} envMapIntensity={floorReflections ? 1 : 0} roughness={1} />
      </mesh>
      <Chandelier key={resetEpoch} />
    </group>
    {walls.filter(wall => wall.room === 'sienna').map(wall => <group key={wall.id} position={wall.center} rotation={[0, wall.rotation, 0]}>
      {Array.from({length: Math.floor(wall.width / 2)}, (_, i) => i * 2 - wall.width / 2 + 1).filter(u => !wall.holes?.some(hole => Math.abs(u - hole.u) < hole.width / 2 + 1)).map(u => <group key={u} position={[u, 0, 0]}>
        <Box color='#684632' map={wood} position={[0, 0.92, 0.125]} roughness={0.6} size={[1.88, 0.94, 0.025]} />
        <Box color='#503528' map={wood} position={[0, 0.92, 0.145]} roughness={0.7} size={[1.55, 0.65, 0.025]} />
        <Box color='#785b35' metalness={0.4} position={[0, 1.42, 0.145]} size={[1.98, 0.045, 0.09]} />
      </group>)}
    </group>)}
  </>
}
