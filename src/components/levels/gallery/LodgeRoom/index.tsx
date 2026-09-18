import type {Material, Texture} from 'three/webgpu'

import {CuboidCollider, RigidBody} from '@react-three/rapier'

import BenchSeat from '#component/levels/gallery/BenchSeat'
import Box from '#src/components/Scene/primitives.tsx'
import lodge from '#src/lib/gallery/lodge.ts'

export default function LodgeRoom({wood, stone}: {
  stone: Material
  wood: Texture
}) {
  const [width, depth] = lodge.size
  return <group name='lodge-room' position={[lodge.center[0], lodge.floorY, lodge.center[1]]}>
    <RigidBody colliders={false} type='fixed'>
      <CuboidCollider args={[width / 2, 0.15, depth / 2]} position={[0, -0.15, 0]} />
      <CuboidCollider args={[width / 2, 0.12, depth / 2]} position={[0, lodge.height + 0.12, 0]} />
      <Box color='#765036' envMapIntensity={0.2} map={wood} position={[0, -0.15, 0]} roughness={0.86} size={[width, 0.3, depth]} />
      <Box color='#513a29' map={wood} position={[0, lodge.height + 0.12, 0]} size={[width, 0.24, depth]} />
      {[-3.5, 0, 3.5].map(z => <Box key={z} color='#302319' map={wood} position={[0, lodge.height - 0.16, z]} size={[width, 0.32, 0.3]} />)}
    </RigidBody>
    <RigidBody colliders='cuboid' type='fixed'>
      <group position={[-3.7, 0, 1.5]} rotation={[0, Math.PI / 2, 0]}>
        <BenchSeat position={[0, 0.52, 0]} size={[3.3, 0.23, 0.85]} />
        {[-1.2, 1.2].map(x => <Box key={x} color='#37291d' position={[x, 0.21, 0]} size={[0.22, 0.42, 0.65]} />)}
        <Box color='#60432c' map={wood} position={[0, 0.95, -0.36]} size={[3.3, 0.52, 0.13]} />
      </group>
      <Box color='#65432b' map={wood} position={[0, 0.7, -1.3]} size={[2.5, 0.25, 1.05]} />
      {[-0.95, 0.95].map(x => <Box key={x} color='#342319' position={[x, 0.3, -1.3]} size={[0.18, 0.6, 0.75]} />)}
    </RigidBody>
    <group name='lodge-fireplace' rotation={[0, Math.PI, 0]}>
      <RigidBody colliders='cuboid' type='fixed'>
        <Box material={stone} name='lodge-hearth' position={[0, 0.1, -4.35]} size={[3.8, 0.2, 1.2]} />
        {[-1.45, 1.45].map(x => <Box key={x} material={stone} position={[x, 1, -4.35]} size={[0.6, 1.8, 0.9]} />)}
        <Box material={stone} position={[0, 2.1, -4.35]} size={[3.8, 0.4, 1.1]} />
        <Box material={stone} position={[0, 3, -4.62]} size={[3, 1.6, 0.18]} />
        <Box color='#120e0b' position={[0, 0.95, -4.7]} size={[2.3, 1.5, 0.06]} />
        {[-0.27, 0.27].map(z => <mesh key={z} castShadow position={[0, 0.42, -4.2 + z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.15, 0.18, 1.65, 12]} /><meshStandardNodeMaterial color='#352015' roughness={1} />
        </mesh>)}
      </RigidBody>
      <mesh name='lodge-embers' position={[0, 0.25, -4.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.9, 0.7]} /><meshStandardNodeMaterial color='#9b2609' emissive='#f85b12' emissiveIntensity={2} />
      </mesh>
      <pointLight color='#ffb45b' distance={8} intensity={20} name='lodge-firelight' position={[0, 0.7, -3.85]} />
    </group>
    <Box color='#443c2b' envMapIntensity={0} position={[0, 0.008, 0.4]} roughness={1} size={[3.5, 0.015, 4.6]} />
    <mesh position={[0, 3.1, 0.8]}><cylinderGeometry args={[0.5, 0.65, 0.16, 32]} /><meshStandardNodeMaterial color='#e8c894' emissive='#ffd69a' emissiveIntensity={1.8} /></mesh>
    <Box color='#302319' metalness={0.8} position={[0, 3.55, 0.8]} size={[0.025, 0.65, 0.025]} />
    <pointLight color='#ffdfad' decay={2} distance={12} intensity={48} position={[0, 2.9, 0.8]} />
  </group>
}
