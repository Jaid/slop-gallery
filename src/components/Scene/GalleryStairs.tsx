import {CuboidCollider, RigidBody} from '@react-three/rapier'

import CanvasText from '#component/CanvasText'
import {stairBlocks, staircase, stairFlights, stairRails, stairRoofs, stairTurn} from '#src/lib/gallery/staircase.ts'

import {Box} from './primitives.tsx'

export default function GalleryStairs() {
  return <group name="undertone-stairway">
    <RigidBody type="fixed" colliders={false}>
      {stairBlocks.map(({position, size}, i) => <group key={i}>
        <CuboidCollider position={position} args={[size[0] / 2, size[1] / 2, size[2] / 2]}/>
        <Box name={`stair-block-${i}`} position={position} size={size} color="#26383e" roughness={0.9} envMapIntensity={0}/>
      </group>)}
    </RigidBody>
    {stairBlocks.filter(block => block.tread).map(({position, size, top, direction}, i) => <mesh key={i} position={[position[0] - direction * (size[0] / 2 - 0.035), top + 0.004, position[2]]}>
      <boxGeometry args={[0.025, 0.008, staircase.width - 0.45]}/>
      <meshBasicNodeMaterial color={i % 3 === 0 ? '#d5ad73' : '#62958e'} toneMapped={false}/>
    </mesh>)}
    <RigidBody type="fixed" colliders="cuboid">
      {stairRoofs.map((beam, i) => <Box key={i} name="stairway-ceiling" {...beam} color="#101e24" envMapIntensity={0}/>)}
      {stairRails.map((beam, i) => <Box key={i} name="stairway-handrail" {...beam} color="#ac8c58" metalness={0.65} roughness={0.45}/>)}
    </RigidBody>
    {stairFlights.flatMap(flight => [3, 10, 17].map(index => {
      const step = flight.blocks[index]!
      return <pointLight key={flight.id + index} position={[step.position[0], step.top + 0.65, step.position[2]]} color="#8ad6cd" intensity={2} distance={3} decay={2}/>
    }))}
    <pointLight position={[stairTurn.position[0], stairTurn.top + 2.8, stairTurn.position[2]]} color="#8ad6cd" intensity={4} distance={5} decay={2}/>
    <group position={[3.72, 4.15, staircase.z]} rotation={[0, -Math.PI / 2, 0]}>
      <CanvasText text="06 / THE UNDERTONE" width={2.25} height={0.25} color="#94774e" fontWeight={600}/>
      <CanvasText text="↓  Stairs to the lower gallery" position={[0, -0.3, 0]} width={2.1} height={0.2} color="#94774e"/>
    </group>
    <group position={[0, 4.25, 8.16]}>
      <CanvasText text="04 / THE ANTECHAMBER" width={3.8} height={0.32} color="#94774e"/>
    </group>
    <CanvasText text="↑  Antechamber" position={[staircase.endX - 0.28, staircase.bottomY + 4.05, staircase.returnZ]} rotation={[0, -Math.PI / 2, 0]} width={2.1} height={0.25} color="#d5ad73"/>
  </group>
}
