import type {Wall} from '#src/lib/gallery.ts'
import type {Material, Texture} from 'three/webgpu'

import {useThree} from '@react-three/fiber/webgpu'
import {CuboidCollider, RigidBody, TrimeshCollider} from '@react-three/rapier'
import {useEffect, useMemo} from 'react'
import {EquirectangularReflectionMapping, MeshStandardNodeMaterial, Shape, SRGBColorSpace} from 'three/webgpu'

import {rooms, walls} from '#src/lib/gallery.ts'
import {architectureGeometry, wallTop} from '#src/lib/gallery/architecture.ts'
import {CastleStoneMaterial} from '#src/lib/materials/CastleStoneMaterial.ts'
import {LodgeWoodMaterial} from '#src/lib/materials/LodgeWoodMaterial.ts'
import {canvasTexture} from '#src/lib/texture.ts'

import Fountain from './Fountain.tsx'
import FountainBenches from './FountainBenches.tsx'
import GalleryStairs from './GalleryStairs.tsx'
import LodgeCorridorRoute from './LodgeCorridorRoute.tsx'
import LodgeRoom from './LodgeRoom.tsx'
import LodgeWindow from './LodgeWindow.tsx'
import MainEntrance from './MainEntrance.tsx'
import {damaskTexture, surfaceTexture} from './materials.ts'
import MoonfallRoom from './MoonfallRoom.tsx'
import OculusRoom from './OculusRoom.tsx'
import PottedPlants from './PottedPlants.tsx'
import {Box} from './primitives.tsx'
import RoomFloor from './RoomFloor.tsx'
import SiennaRoom from './SiennaRoom.tsx'
import VesperOrnaments from './VesperOrnaments.tsx'

const pointLightPositions: Partial<Record<Wall['room'], Array<number>>> = {
  antechamber: [0],
  lobby: [-16, -8, 0, 8.5, 15.5],
}

export default function Architecture() {
  const castleStone = useMemo(() => new CastleStoneMaterial, [])
  const lodgeWood = useMemo(() => new LodgeWoodMaterial, [])
  useEffect(() => () => {
    castleStone.dispose()
    lodgeWood.dispose()
  }, [castleStone, lodgeWood])
  const textures = useMemo(() => ({
    stone: surfaceTexture('stone'),
    plaster: surfaceTexture('plaster'),
    wood: surfaceTexture('wood'),
    damask: damaskTexture(rooms.find(room => room.id === 'sienna')!.size[0], wallTop),
  }), [])
  const oculusMaterial = useMemo(() => new MeshStandardNodeMaterial({
    map: textures.stone,
    color: '#4c5558',
    roughness: 0.95,
    envMapIntensity: 0,
  }), [textures])
  useEffect(() => () => oculusMaterial.dispose(), [oculusMaterial])
  useEffect(() => () => {
    for (const t of Object.values(textures)) {
      t.dispose()
    }
  }, [textures])
  const wallMaterial = (wall: Wall) => {
    if (wall.room === 'oculus') {
      return oculusMaterial
    }
    if (wall.room === 'lodge') {
      return wall.id.startsWith('lodge-tunnel-') ? castleStone : lodgeWood
    }
    if (wall.room === 'corridor') {
      return lodgeWood
    }
  }
  return <>
    <ReflectionEnvironment/>
    <color attach="background" args={['#ded8ca']}/><fog attach="fog" args={['#d9d4c7', 35, 70]}/>
    <ambientLight intensity={0.65}/><hemisphereLight args={['#ecf3ff', '#a29270', 1.15]}/>
    <directionalLight position={[-3, 9, 4]} intensity={2.3} color="#fff0d7" castShadow shadow-mapSize={[4096, 4096]} shadow-camera-left={-24} shadow-camera-right={24} shadow-camera-top={20} shadow-camera-bottom={-20} shadow-normalBias={0.035}/>
    {walls.map(wall => <WallSurface key={wall.id} material={wallMaterial(wall)} wall={wall} plaster={wall.room === 'sienna' ? textures.damask : textures.plaster}/>)}
    {rooms.filter(room => room.floorY === 0 && room.id !== 'sienna').map(room => <group key={room.id} position={[room.center[0], 0, room.center[1]]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[room.size[0] / 2, 0.15, room.size[1] / 2]} position={[0, 5.9, 0]}/>
      </RigidBody>
      <RoomFloor room={room} stone={textures.stone} wood={textures.wood}/>
      <Box position={[0, 5.78, 0]} size={[room.size[0], 0.18, room.size[1]]} color={room.id === 'vesper' ? '#7c9586' : '#e1dccc'}/>
      {(room.id === 'antechamber' ? [0] : Array.from({length: room.size[1] / 4 - 1}, (_, i) => i * 4 - room.size[1] / 2 + 4)).map(z => <group key={z}>
        <Box position={[0, 5.6, z]} size={[room.size[0] * 0.48, 0.1, 2.6]} color="#a29982"/>
        <mesh position={[0, 5.54, z]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[room.size[0] * 0.48 - 0.1, 2.45]}/><meshBasicNodeMaterial color={room.id === 'dine' ? '#efe6ff' : '#fff3d8'}/></mesh>
        {[-1, 0, 1].map(x => <Box key={x} position={[x * room.size[0] * 0.12, 5.5, z]} size={[0.045, 0.12, 2.5]} color="#c0b7a1"/>)}
      </group>)}
      {(pointLightPositions[room.id] ?? [-3.5, 3.5]).map(z => <pointLight key={z} position={[0, 4.9, z]} intensity={room.id === 'vesper' ? 40 : 32} distance={room.id === 'lobby' && z === -8 ? 22 : 14} decay={2} castShadow={room.id === 'lobby' && z === -8} shadow-mapSize={[1024, 1024]} shadow-normalBias={0.03} color={room.id === 'dine' ? '#eee3ff' : '#fff1d8'}/>)}
    </group>)}
    <PottedPlants/>
    <Fountain/>
    <FountainBenches wood={textures.wood}/>
    <LodgeRoom wood={textures.wood} stone={castleStone}/>
    <LodgeWindow material={lodgeWood}/>
    <LodgeCorridorRoute material={castleStone}/>
    <VesperOrnaments/>
    <SiennaRoom wood={textures.wood}/>
    <GalleryStairs/>
    <MoonfallRoom stone={textures.stone}/>
    <OculusRoom material={oculusMaterial}/>

  </>
}

function Alcove({width = 3.1, color = '#c8c8b6'}: {color?: string
  width?: number}) {
  const shape = useMemo(() => {
    const shape = new Shape
    const radius = width / 2
    shape.moveTo(-radius, 0)
    shape.lineTo(radius, 0)
    shape.lineTo(radius, 3.05)
    shape.absarc(0, 3.05, radius, 0, Math.PI, false)
    shape.lineTo(-radius, 0)
    return shape
  }, [width])
  return <group position={[0, 0.42, 0.112]}>
    <mesh><shapeGeometry args={[shape, 48]}/><meshStandardNodeMaterial color="#a6a68e" roughness={0.95}/></mesh>
    <mesh position={[0, 0.028, 0.004]} scale={[0.976, 0.987, 1]}><shapeGeometry args={[shape, 48]}/><meshStandardNodeMaterial color={color} roughness={0.95}/></mesh>
  </group>
}
function WallSurface({wall, plaster, material}: {material?: Material
  plaster: Texture
  wall: Wall}) {
  const colors: Partial<Record<Wall['room'], string>> = {
    moonfall: '#14282f',
    oculus: '#4b5559',
    sienna: '#ffffff',
    vesper: '#658578',
    dine: '#9295a2',
    antechamber: '#ded4b8',
  }
  const color = colors[wall.room] ?? '#eee7d7'
  const trims: Partial<Record<Wall['room'], string>> = {
    moonfall: '#253a40',
    oculus: '#303d42',
    sienna: '#35251f',
    vesper: '#44655a',
    dine: '#71778b',
  }
  const trim = trims[wall.room] ?? '#ded5c1'
  const geometry = architectureGeometry(wall)
  return <group name={wall.id} userData={{
    wallId: wall.id,
    room: wall.room,
  }} position={wall.center} rotation={[0, wall.rotation, 0]}>
    <RigidBody type="fixed" colliders={false}>
      {geometry.collision.map((args, i) => <TrimeshCollider key={i} args={args}/>)}
      <mesh name={`wall-${wall.id}`} receiveShadow castShadow material={material}><primitive object={geometry.surface} attach="geometry"/>{!material && <meshStandardNodeMaterial color={color} map={plaster} envMapIntensity={wall.room === 'moonfall' ? 0.08 : 1} roughness={wall.room === 'sienna' ? 0.86 : 0.9}/>}</mesh>
      {geometry.trim.map((part, i) => <mesh key={i} receiveShadow castShadow material={material}><primitive object={part} attach="geometry"/>{!material && <meshStandardNodeMaterial color={trim} roughness={0.6}/>}</mesh>)}
      {geometry.glazing.map((part, i) => <mesh key={i} name={`glass-${wall.id}`} geometry={part}>
        <meshStandardNodeMaterial color="#b7d8d9" transparent opacity={0.16} roughness={0.16} metalness={0.1} depthWrite={false}/>
      </mesh>)}
    </RigidBody>
    {geometry.cornice.map((part, i) => <mesh key={i} geometry={part} material={material} receiveShadow castShadow>{!material && <meshStandardNodeMaterial color={trim} roughness={0.6}/>}</mesh>)}
    {wall.id === 'lobby-north' && <>
      <MainEntrance/>
      {[-3.6, 3.6].map(x => <group position={[x, 0, 0]} key={x}><Alcove width={2.6}/><Box position={[0, 4.67, 0.55]} size={[0.76, 0.06, 0.16]} color="#ab8850" metalness={0.7}/><mesh position={[0, 4.637, 0.55]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.62, 0.12]}/><meshBasicNodeMaterial color="#fff0cf"/></mesh></group>)}
      {[-5.3, -2.2, 2.2, 5.3].map(x => <group key={x}><Box position={[x, 2.7, 0.16]} size={[0.18, 4.9, 0.2]} color={trim} material={material}/><Box position={[x, 4.94, 0.24]} size={[0.34, 0.15, 0.28]} color={trim} material={material}/></group>)}
    </>}
    {(wall.id === 'lobby-east' || wall.id === 'lobby-west') && <group position={[wall.id === 'lobby-east' ? -2.8 : 2.8, 0, 0]}><Alcove width={3.5}/></group>}
  </group>
}
function ReflectionEnvironment() {
  const scene = useThree(s => s.scene)
  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 512
    const context = canvas.getContext('2d')!
    const gradient = context.createLinearGradient(0, 0, 0, 512)
    gradient.addColorStop(0, '#e6eeed')
    gradient.addColorStop(0.4, '#b6bcac')
    gradient.addColorStop(0.55, '#7d816c')
    gradient.addColorStop(1, '#4b4c3d')
    context.fillStyle = gradient
    context.fillRect(0, 0, 1024, 512)
    context.fillStyle = '#fff9e6'
    for (let i = 0; i < 4; i++) {
      context.fillRect(i * 256 + 35, 50, 90, 100)
    }
    const texture = canvasTexture(canvas)
    texture.mapping = EquirectangularReflectionMapping
    texture.colorSpace = SRGBColorSpace
    const previous = scene.environment
    scene.environment = texture
    scene.environmentIntensity = 0.5
    return () => {
      scene.environment = previous
      texture.dispose()
    }
  }, [scene])
  return null
}
