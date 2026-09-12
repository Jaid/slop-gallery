import type {Wall} from '#src/lib/gallery.ts'
import type {Material, Texture} from 'three/webgpu'

import {RigidBody, TrimeshCollider} from '@react-three/rapier'
import Branch from 'branch-component'

import {WallDecorations} from '#level/components.ts'
import {architectureGeometry} from '#src/lib/gallery/architecture.ts'

export default function WallSurface({wall, plaster, material, surfaceRoom = wall.room}: {material?: Material
  plaster: Texture
  surfaceRoom?: Wall['room']
  wall: Wall}) {
  const colors: Partial<Record<Wall['room'], string>> = {
    moonfall: '#14282f',
    oculus: '#4b5559',
    sienna: '#ffffff',
    vesper: '#658578',
    dine: '#9295a2',
    antechamber: '#ded4b8',
  }
  const color = colors[surfaceRoom] ?? '#eee7d7'
  const trims: Partial<Record<Wall['room'], string>> = {
    moonfall: '#253a40',
    oculus: '#303d42',
    sienna: '#35251f',
    vesper: '#44655a',
    dine: '#71778b',
  }
  const trim = trims[surfaceRoom] ?? '#ded5c1'
  const geometry = architectureGeometry(wall)
  return <group name={wall.id} userData={{
    wallId: wall.id,
    room: wall.room,
  }} position={wall.center} rotation={[0, wall.rotation, 0]}>
    <RigidBody type="fixed" colliders={false}>
      {geometry.collision.map((args, i) => <TrimeshCollider key={i} args={args}/>)}
      <mesh name={`wall-${wall.id}`} receiveShadow castShadow material={material}><primitive object={geometry.surface} attach="geometry"/><Branch unless={material}><meshStandardNodeMaterial color={color} map={plaster} envMapIntensity={surfaceRoom === 'moonfall' ? 0.08 : 1} roughness={surfaceRoom === 'sienna' ? 0.86 : 0.9}/></Branch></mesh>
      {geometry.trim.map((part, i) => <mesh key={i} receiveShadow castShadow material={material}><primitive object={part} attach="geometry"/><Branch unless={material}><meshStandardNodeMaterial color={trim} roughness={0.6}/></Branch></mesh>)}
      {geometry.glazing.map((part, i) => <mesh key={i} name={`glass-${wall.id}`} geometry={part}>
        <meshStandardNodeMaterial color="#b7d8d9" transparent opacity={0.16} roughness={0.16} metalness={0.1} depthWrite={false}/>
      </mesh>)}
    </RigidBody>
    {geometry.cornice.map((part, i) => <mesh key={i} geometry={part} material={material} receiveShadow castShadow><Branch unless={material}><meshStandardNodeMaterial color={trim} roughness={0.6}/></Branch></mesh>)}
    <WallDecorations wall={wall} trim={trim} material={material}/>
  </group>
}
