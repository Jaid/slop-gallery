import {CuboidCollider, RigidBody} from '@react-three/rapier'
import {useEffect, useMemo} from 'react'

import MeshSurfaceCollider from '#component/levels/gallery/MeshSurfaceCollider'
import Box from '#src/components/Scene/primitives.tsx'
import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import {stairBlocks, stairFlights, stairRailGeometry, stairRoofs, stairTurn} from '#src/lib/gallery/staircase.ts'

export default function GalleryStairs() {
  const turn = useMemo(() => [
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
  })), [])
  useEffect(() => () => {
    for (const part of turn) {
      part.geometry.dispose()
    }
  }, [turn])
  return <group name="moonfall-stairway">
    <RigidBody type="fixed" colliders={false}>
      {stairBlocks.map(({position, size}, i) => <group key={i}>
        <CuboidCollider position={position} args={[size[0] / 2, size[1] / 2, size[2] / 2]}/>
        <Box name={`stair-block-${i}`} position={position} size={size} color="#26383e" roughness={0.9} envMapIntensity={0}/>
      </group>)}
    </RigidBody>
    <RigidBody type="fixed" colliders={false}>
      {turn.map(part => <group key={part.name}>
        <MeshSurfaceCollider args={part.collision}/>
        <mesh name={`stairway-round-${part.name}`} geometry={part.geometry} receiveShadow castShadow>
          <meshStandardNodeMaterial color={part.color} roughness={part.roughness} metalness={part.name.startsWith('handrail') ? 0.65 : 0} envMapIntensity={part.name.startsWith('handrail') ? 1 : 0}/>
        </mesh>
      </group>)}
    </RigidBody>
    {stairBlocks.filter(block => block.tread).map(({position, size, top, direction}, i) => <mesh key={i} position={[position[0] - direction * (size[0] / 2 - 0.035), top + 0.004, position[2]]}>
      <boxGeometry args={[0.025, 0.008, size[2] - 0.45]}/>
      <meshBasicNodeMaterial color={i % 3 === 0 ? '#d5ad73' : '#62958e'} toneMapped={false}/>
    </mesh>)}
    <RigidBody type="fixed" colliders="cuboid">
      {stairRoofs.map((beam, i) => <Box key={i} name="stairway-ceiling" {...beam} color="#101e24" envMapIntensity={0}/>)}
    </RigidBody>
    {stairFlights.flatMap(flight => [3, 10, 17].map(index => {
      const step = flight.blocks[index]
      return <pointLight key={flight.id + index} position={[step.position[0], step.top + 0.65, step.position[2]]} color="#8ad6cd" intensity={2} distance={3} decay={2}/>
    }))}
    <pointLight position={[stairTurn.position[0], stairTurn.top + 2.8, stairTurn.position[2]]} color="#8ad6cd" intensity={4} distance={5} decay={2}/>
  </group>
}
