import type {Wall} from '#src/lib/gallery.ts'
import type {Material, Texture} from 'three/webgpu'

import {RigidBody, TrimeshCollider} from '@react-three/rapier'
import Branch from 'branch-component'

import {WallDecorations} from '#level/components.ts'
import {architectureGeometry} from '#src/lib/gallery/architecture.ts'

export default function WallSurface({wall, plaster, material, surfaceMaterial, surfaceRoom = wall.room}: {
  material?: Material
  plaster: Texture
  surfaceMaterial?: Material
  surfaceRoom?: Wall['room']
  wall: Wall
}) {
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
  return <group
    name={wall.id} position={wall.center} rotation={[0, wall.rotation, 0]} userData={{
      wallId: wall.id,
      room: wall.room,
    }}
  >
    <RigidBody colliders={false} type='fixed'>
      {geometry.collision.map((args, i) => <TrimeshCollider args={args} key={i} />)}
      <mesh castShadow material={surfaceMaterial ?? material} name={`wall-${wall.id}`} receiveShadow><primitive attach='geometry' object={geometry.surface} /><Branch not={surfaceMaterial ?? material}><meshStandardNodeMaterial color={color} envMapIntensity={surfaceRoom === 'moonfall' ? 0.08 : 1} map={plaster} roughness={surfaceRoom === 'sienna' ? 0.86 : 0.9} /></Branch></mesh>
      {geometry.trim.map((part, i) => <mesh castShadow key={i} material={material} receiveShadow><primitive attach='geometry' object={part} /><Branch not={material}><meshStandardNodeMaterial color={trim} roughness={0.6} /></Branch></mesh>)}
      {geometry.glazing.map((part, i) => <mesh geometry={part} key={i} name={`glass-${wall.id}`}>
        <meshStandardNodeMaterial color='#b7d8d9' depthWrite={false} metalness={0.1} opacity={0.16} roughness={0.16} transparent />
      </mesh>)}
    </RigidBody>
    {geometry.cornice.map((part, i) => <mesh castShadow geometry={part} key={i} material={material} receiveShadow><Branch not={material}><meshStandardNodeMaterial color={trim} roughness={0.6} /></Branch></mesh>)}
    <WallDecorations material={material} trim={trim} wall={wall} />
  </group>
}
