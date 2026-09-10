import type {Material} from 'three/webgpu'

import {CuboidCollider, RigidBody} from '@react-three/rapier'
import {useEffect, useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import {cabinRails, cabinStairs} from '#src/lib/gallery/cabin.ts'
import {TimberGeometry} from '#src/lib/gallery/passages/TimberGeometry.ts'
import {StairCarpetGeometry} from '#src/lib/gallery/stairs/StairCarpetGeometry.ts'
import {RoomFloorTextures} from '#src/lib/materials/RoomFloorTextures.ts'

import {Box} from './primitives.tsx'
import TimberFrame from './TimberFrame.tsx'

export default function AmberStairs({timber, lining}: {lining: Material
  timber: Material}) {
  const frame = useMemo(() => TimberGeometry.stairs(cabinStairs), [])
  useEffect(() => () => frame.dispose(), [frame])
  const textures = useMemo(() => new RoomFloorTextures(cabinStairs.width, cabinStairs.run, 1, 1), [])
  const carpet = useMemo(() => new StairCarpetGeometry(cabinStairs.width - 0.5, Math.min(0.38, cabinStairs.run - 0.05)), [])
  const wood = useMemo(() => new MeshStandardNodeMaterial({
    ...textures.wood,
    bumpScale: 0.035,
    roughness: 0.64,
    envMapIntensity: 0.2,
  }), [textures])
  const fabric = useMemo(() => new MeshStandardNodeMaterial({
    ...textures.carpet,
    bumpScale: 0.008,
    roughness: 1,
    envMapIntensity: 0,
  }), [textures])
  useEffect(() => () => {
    textures.dispose()
    carpet.dispose()
    wood.dispose()
    fabric.dispose()
  }, [textures, carpet, wood, fabric])
  return <group name="amber-wooden-stairs">
    <RigidBody type="fixed" colliders={false}>
      {cabinStairs.blocks.map((block, i) => <group key={i}>
        <CuboidCollider position={block.position} args={[block.size[0] / 2, block.size[1] / 2, block.size[2] / 2]}/>
        <Box name="amber-stair-tread" position={block.position} size={block.size} material={wood}/>
        {block.tread && <mesh name="amber-half-round-tread-carpet" geometry={carpet} material={fabric} position={[block.position[0] + block.size[0] / 2 - 0.025, block.top + 0.001, block.position[2]]} rotation={[0, Math.PI / 2, 0]} receiveShadow/>}
      </group>)}
      <TimberFrame geometry={frame} material={timber} lining={lining}/>
      {cabinRails.map((beam, i) => <group key={i} position={beam.position} rotation={beam.rotation}>
        <CuboidCollider args={[beam.size[0] / 2, beam.size[1] / 2, beam.size[2] / 2]}/>
        <Box size={beam.size} material={timber}/>
      </group>)}
    </RigidBody>
    {[4, 13, 23].map(index => {
      const block = cabinStairs.blocks[index]!
      return <group key={index} position={[block.position[0], block.top + 2.5, block.position[2]]}>
        <mesh><sphereGeometry args={[0.08, 12, 8]}/><meshStandardNodeMaterial color="#fff0cb" emissive="#ffd69a" emissiveIntensity={2}/></mesh>
        <pointLight color="#ffdca3" intensity={14} distance={6}/>
      </group>
    })}
  </group>
}
