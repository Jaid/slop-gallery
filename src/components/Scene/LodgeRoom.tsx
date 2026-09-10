import type {Material, Texture} from 'three/webgpu'

import {CuboidCollider, RigidBody} from '@react-three/rapier'

import {lodge} from '#src/lib/gallery/lodge.ts'

import BenchSeat from './BenchSeat.tsx'
import {Box} from './primitives.tsx'

export default function LodgeRoom({wood, stone}: {stone: Material
  wood: Texture}) {
  const [width, depth] = lodge.size
  return <group name="lodge-room" position={[lodge.center[0], lodge.floorY, lodge.center[1]]}>
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[width / 2, 0.15, depth / 2]} position={[0, -0.15, 0]}/>
      <CuboidCollider args={[width / 2, 0.12, depth / 2]} position={[0, lodge.height + 0.12, 0]}/>
      <Box size={[width, 0.3, depth]} position={[0, -0.15, 0]} map={wood} color="#765036" roughness={0.86} envMapIntensity={0.2}/>
      <Box size={[width, 0.24, depth]} position={[0, lodge.height + 0.12, 0]} map={wood} color="#513a29"/>
      {[-3.5, 0, 3.5].map(z => <Box key={z} size={[width, 0.32, 0.3]} position={[0, lodge.height - 0.16, z]} map={wood} color="#302319"/>)}
    </RigidBody>
    <RigidBody type="fixed" colliders="cuboid">
      <group position={[-3.7, 0, 1.5]} rotation={[0, Math.PI / 2, 0]}>
        <BenchSeat size={[3.3, 0.23, 0.85]} position={[0, 0.52, 0]}/>
        {[-1.2, 1.2].map(x => <Box key={x} size={[0.22, 0.42, 0.65]} position={[x, 0.21, 0]} color="#37291d"/>)}
        <Box size={[3.3, 0.52, 0.13]} position={[0, 0.95, -0.36]} map={wood} color="#60432c"/>
      </group>
      <Box size={[2.5, 0.25, 1.05]} position={[0, 0.7, -1.3]} map={wood} color="#65432b"/>
      {[-0.95, 0.95].map(x => <Box key={x} size={[0.18, 0.6, 0.75]} position={[x, 0.3, -1.3]} color="#342319"/>)}
    </RigidBody>
    <group name="lodge-fireplace" rotation={[0, Math.PI, 0]}>
      <RigidBody type="fixed" colliders="cuboid">
        <Box name="lodge-hearth" size={[3.8, 0.2, 1.2]} position={[0, 0.1, -4.35]} material={stone}/>
        {[-1.45, 1.45].map(x => <Box key={x} size={[0.6, 1.8, 0.9]} position={[x, 1, -4.35]} material={stone}/>)}
        <Box size={[3.8, 0.4, 1.1]} position={[0, 2.1, -4.35]} material={stone}/>
        <Box size={[3, 1.6, 0.18]} position={[0, 3, -4.62]} material={stone}/>
        <Box size={[2.3, 1.5, 0.06]} position={[0, 0.95, -4.7]} color="#120e0b"/>
        {[-0.27, 0.27].map(z => <mesh key={z} position={[0, 0.42, -4.2 + z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.15, 0.18, 1.65, 12]}/><meshStandardNodeMaterial color="#352015" roughness={1}/>
        </mesh>)}
      </RigidBody>
      <mesh name="lodge-embers" position={[0, 0.25, -4.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.9, 0.7]}/><meshStandardNodeMaterial color="#9b2609" emissive="#f85b12" emissiveIntensity={2}/>
      </mesh>
      <pointLight name="lodge-firelight" position={[0, 0.7, -3.85]} color="#ffb45b" intensity={20} distance={8}/>
    </group>
    <Box size={[3.5, 0.015, 4.6]} position={[0, 0.008, 0.4]} color="#443c2b" roughness={1} envMapIntensity={0}/>
    <mesh position={[0, 3.1, 0.8]}><cylinderGeometry args={[0.5, 0.65, 0.16, 32]}/><meshStandardNodeMaterial color="#e8c894" emissive="#ffd69a" emissiveIntensity={1.8}/></mesh>
    <Box size={[0.025, 0.65, 0.025]} position={[0, 3.55, 0.8]} color="#302319" metalness={0.8}/>
    <pointLight position={[0, 2.9, 0.8]} color="#ffdfad" intensity={48} distance={12} decay={2}/>
  </group>
}
