import {CuboidCollider, RigidBody} from '@react-three/rapier'
import {useEffect} from 'react'

import MeshSurfaceCollider from '#component/levels/gallery/MeshSurfaceCollider'
import Box from '#src/components/Scene/primitives.tsx'
import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import {stairBlocks, stairFlights, stairRailGeometry, stairRoofs, stairTurn} from '#src/lib/gallery/staircase.ts'

export default function GalleryStairs() {
  const turn = [
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
  useEffect(() => () => {
    for (const part of turn) {
      part.geometry.dispose()
    }
  }, [turn])
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
    {stairFlights.flatMap(flight => [3, 10, 17].map(index => {
      const step = flight.blocks[index]
      return <pointLight key={flight.id + index} color='#8ad6cd' decay={2} distance={3} intensity={2} position={[step.position[0], step.top + 0.65, step.position[2]]} />
    }))}
    <pointLight color='#8ad6cd' decay={2} distance={5} intensity={4} position={[stairTurn.position[0], stairTurn.top + 2.8, stairTurn.position[2]]} />
  </group>
}
