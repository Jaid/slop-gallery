import type {Wall} from '#src/lib/gallery.ts'
import type {ComponentType} from 'react'
import type {Material, Texture} from 'three/webgpu'

import {RigidBody, TrimeshCollider} from '@react-three/rapier'
import Branch from 'branch-component'

import {architectureGeometry} from '#src/lib/gallery/architecture.ts'

/** what a world draws on one of its walls beyond the wall itself, like an entrance surround */
export type WallDecorationsProps = {
  material?: Material
  /** the color the wall’s trim takes without a material of its own */
  trim: string
  wall: Wall
}

/** draws nothing on a wall */
const noDecorations = () => null

export default function WallSurface({wall, plaster, glass, material, surfaceMaterial, surfaceRoom = wall.room, decorations: Decorations = noDecorations}: {
  /** what the world draws on the wall beyond the wall itself, nothing by default */
  decorations?: ComponentType<WallDecorationsProps>
  glass?: Material
  material?: Material
  plaster: Texture
  surfaceMaterial?: Material
  surfaceRoom?: Wall['room']
  wall: Wall
}) {
  const colors: Partial<Record<Wall['room'], string>> = {
    moonfall: '#14282f',
    oculus: '#4b5559',
    vesper: '#658578',
    antechamber: '#ded4b8',
    salon: '#34506a',
  }
  const color = colors[surfaceRoom] ?? '#eee7d7'
  const trims: Partial<Record<Wall['room'], string>> = {
    moonfall: '#253a40',
    oculus: '#303d42',
    vesper: '#44655a',
    salon: '#1f2f3e',
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
      {geometry.collision.map((args, i) => <TrimeshCollider key={i} args={args} />)}
      <mesh castShadow material={surfaceMaterial ?? material} name={`wall-${wall.id}`} receiveShadow><primitive attach='geometry' object={geometry.surface} /><Branch not={surfaceMaterial ?? material}><meshStandardNodeMaterial color={color} envMapIntensity={surfaceRoom === 'moonfall' ? 0.08 : 1} map={plaster} roughness={0.9} /></Branch></mesh>
      {geometry.trim.map((part, i) => <mesh key={i} castShadow material={material} name={`trim-${wall.id}`} receiveShadow><primitive attach='geometry' object={part} /><Branch not={material}><meshStandardNodeMaterial color={trim} roughness={0.6} /></Branch></mesh>)}
      {geometry.glazing.map((part, i) => <mesh key={i} geometry={part} material={glass} name={`glass-${wall.id}`}>
        <Branch not={glass}><meshStandardNodeMaterial color='#b7d8d9' depthWrite={false} metalness={0.1} opacity={0.16} roughness={0.16} transparent /></Branch>
      </mesh>)}
    </RigidBody>
    {geometry.cornice.map((part, i) => <mesh key={i} castShadow geometry={part} material={material} name={`cornice-${wall.id}`} receiveShadow><Branch not={material}><meshStandardNodeMaterial color={trim} roughness={0.6} /></Branch></mesh>)}
    <Decorations material={material} trim={trim} wall={wall} />
  </group>
}
