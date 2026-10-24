import {CuboidCollider, RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'

import MeshSurfaceCollider from '#component/levels/gallery/MeshSurfaceCollider'
import Box from '#src/components/Scene/primitives.tsx'
import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import {stairBlocks, stairRailGeometry, stairRoofs, stairTurn} from '#src/lib/gallery/staircase.ts'

/** the lamp over the upper flight, lighting the stairway only while the player is in Moonfall, the Antechamber or the Oculus */
const stairLamp = {
  decay: 1,
  distance: 15,
  intensity: 30,
  position: [16.55, -1.28, 13.52],
  rooms: ['moonfall', 'antechamber', 'oculus'],
} as const

export default function GalleryStairs() {
  const turnResource = useDisposable(useMemo(() => {
    const parts = [
      {
        name: 'landing',
        geometry: stairTurn.floorGeometry(),
        color: '#26383e',
        roughness: 0.9,
      },
      {
        name: 'ceiling',
        geometry: stairTurn.roofGeometry(),
        color: '#101e24',
        roughness: 0.9,
      },
      ...(['inner', 'outer'] as const).map(side => ({
        name: `handrail-${side}`,
        geometry: stairRailGeometry(side),
        color: '#ac8c58',
        roughness: 0.45,
      })),
    ].map(part => ({
      ...part,
      collision: colliderGeometry(part.geometry),
    }))
    return {
      parts,
      dispose() {
        for (const part of parts) {
          part.geometry.dispose()
        }
      },
    }
  }, []))
  const {parts: turn} = turnResource
  return <group name='moonfall-stairway'>
    <RigidBody colliders={false} type='fixed'>
      {stairBlocks.map(({position, size}, i) => <group key={i}>
        <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} position={position} />
        <Box color='#26383e' envMapIntensity={0} name={`stair-block-${i}`} position={position} roughness={0.9} size={size} />
      </group>)}
    </RigidBody>
    <RigidBody colliders={false} type='fixed'>
      {turn.map(part => <group key={part.name}>
        <MeshSurfaceCollider args={part.collision} />
        <mesh castShadow geometry={part.geometry} name={`stairway-round-${part.name}`} receiveShadow>
          <meshStandardNodeMaterial color={part.color} envMapIntensity={part.name.startsWith('handrail') ? 1 : 0} metalness={part.name.startsWith('handrail') ? 0.65 : 0} roughness={part.roughness} />
        </mesh>
      </group>)}
    </RigidBody>
    {stairBlocks.filter(block => block.tread).map(({position, size, top, direction}, i) => <mesh key={i} position={[position[0] - direction * (size[0] / 2 - 0.035), top + 0.004, position[2]]}>
      <boxGeometry args={[0.025, 0.008, size[2] - 0.45]} />
      <meshBasicNodeMaterial color={i % 3 === 0 ? '#d5ad73' : '#62958e'} toneMapped={false} />
    </mesh>)}
    <RigidBody colliders='cuboid' type='fixed'>
      {stairRoofs.map((beam, i) => <Box key={i} name='stairway-ceiling' {...beam} color='#101e24' envMapIntensity={0} />)}
    </RigidBody>
    <pointLight color='#8ad6cd' decay={stairLamp.decay} distance={stairLamp.distance} intensity={stairLamp.intensity} position={stairLamp.position} userData={{rooms: stairLamp.rooms}} />
  </group>
}
