import {CuboidCollider, RigidBody} from '@react-three/rapier'

import CanvasText from '#component/CanvasText'
import {stairBlocks, staircase} from '#src/lib/gallery/staircase.ts'

import {Box} from './primitives.tsx'

const length = staircase.endX - staircase.startX
const drop = staircase.topY - staircase.bottomY
const slope = -Math.atan2(drop, length)
const railLength = Math.hypot(length, drop)

export default function GalleryStairs() {
  return <group name="undertone-stairway">
    <RigidBody type="fixed" colliders={false}>
      {stairBlocks.map(({position, size}, i) => <group key={i}>
        <CuboidCollider position={position} args={[size[0] / 2, size[1] / 2, size[2] / 2]}/>
        <Box name={i === 0 ? 'stair-landing' : `stair-tread-${i}`} position={position} size={size} color="#26383e" roughness={0.9} envMapIntensity={0}/>
      </group>)}
    </RigidBody>
    {stairBlocks.slice(1).map(({position, size, top}, i) => <mesh key={i} position={[position[0] - size[0] / 2 + 0.035, top + 0.004, position[2]]}>
      <boxGeometry args={[0.025, 0.008, staircase.width - 0.45]}/>
      <meshBasicNodeMaterial color={i % 3 === 0 ? '#d5ad73' : '#62958e'} toneMapped={false}/>
    </mesh>)}
    <RigidBody type="fixed" colliders="cuboid">
      <Box name="stairway-ceiling" position={[8, 1.8, staircase.z]} rotation={[0, 0, slope]} size={[railLength + 0.2, 0.18, staircase.width]} color="#101e24" envMapIntensity={0}/>
      {[-1, 1].map(side => <Box key={side} name="stairway-handrail" position={[8, -0.8, staircase.z + side * (staircase.width / 2 - 0.22)]} rotation={[0, 0, slope]} size={[railLength, 0.065, 0.065]} color="#ac8c58" metalness={0.65} roughness={0.45}/>)}
    </RigidBody>
    {[3, 9, 15].map(index => {
      const step = stairBlocks[index]!
      return <pointLight key={index} position={[step.position[0], step.top + 0.65, staircase.z]} color="#8ad6cd" intensity={2} distance={3} decay={2}/>
    })}
    <group position={[3.72, 4.15, 11.5]} rotation={[0, -Math.PI / 2, 0]}>
      <CanvasText text="06 / THE UNDERTONE" width={2.25} height={0.25} color="#94774e" fontWeight={600}/>
      <CanvasText text="↓  Stairs to the lower gallery" position={[0, -0.3, 0]} width={2.1} height={0.2} color="#94774e"/>
    </group>
    <group position={[0, 4.25, 8.16]}>
      <CanvasText text="04 / THE ANTECHAMBER" width={3.8} height={0.32} color="#94774e"/>
    </group>
    <CanvasText text="↑  Antechamber" position={[12.28, 0.45, 11.5]} rotation={[0, Math.PI / 2, 0]} width={2.1} height={0.25} color="#d5ad73"/>
  </group>
}
