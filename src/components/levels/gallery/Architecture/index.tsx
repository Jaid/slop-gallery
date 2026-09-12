import type {Wall} from '#src/lib/gallery.ts'

import {useThree} from '@react-three/fiber/webgpu'
import {CuboidCollider, RigidBody} from '@react-three/rapier'
import {useEffect, useMemo} from 'react'
import {EquirectangularReflectionMapping, MeshStandardNodeMaterial, SRGBColorSpace} from 'three/webgpu'
import useGraphicsQuality from 'use-graphics-quality'

import Fountain from '#component/levels/gallery/Fountain'
import FountainBenches from '#component/levels/gallery/FountainBenches'
import GalleryStairs from '#component/levels/gallery/GalleryStairs'
import LodgeCorridorRoute from '#component/levels/gallery/LodgeCorridorRoute'
import LodgeRoom from '#component/levels/gallery/LodgeRoom'
import LodgeWindow from '#component/levels/gallery/LodgeWindow'
import MoonfallRoom from '#component/levels/gallery/MoonfallRoom'
import OculusRoom from '#component/levels/gallery/OculusRoom'
import PottedPlants from '#component/levels/gallery/PottedPlants'
import RoomFloor from '#component/levels/gallery/RoomFloor'
import SiennaRoom from '#component/levels/gallery/SiennaRoom'
import VesperOrnaments from '#component/levels/gallery/VesperOrnaments'
import {damaskTexture, surfaceTexture} from '#src/components/Scene/materials.ts'
import Box from '#src/components/Scene/primitives.tsx'
import WallSurface from '#src/components/Scene/WallSurface.tsx'
import {rooms, walls} from '#src/lib/gallery.ts'
import {wallTop} from '#src/lib/gallery/architecture.ts'
import {createArchitecturalGlassMaterials, disposeArchitecturalGlassMaterials} from '#src/lib/materials/ArchitecturalGlassMaterials.ts'
import CastleStoneMaterial from '#src/lib/materials/CastleStoneMaterial.ts'
import LodgeWoodMaterial from '#src/lib/materials/LodgeWoodMaterial.ts'
import canvasTexture from '#src/lib/texture.ts'

const pointLightPositions: Partial<Record<Wall['room'], Array<number>>> = {
  antechamber: [0],
  lobby: [-16, -8, 0, 8.5, 15.5],
}

export default function Architecture() {
  const isQuality = useGraphicsQuality()
  const glass = useMemo(() => createArchitecturalGlassMaterials(isQuality), [isQuality])
  const castleStone = useMemo(() => new CastleStoneMaterial, [])
  const lodgeWood = useMemo(() => new LodgeWoodMaterial, [])
  useEffect(() => () => disposeArchitecturalGlassMaterials(glass), [glass])
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
    <color attach="background" args={['#ded8ca']}/>
    <ambientLight intensity={0.65}/><hemisphereLight args={['#ecf3ff', '#a29270', 1.15]}/>
    <directionalLight position={[-3, 9, 4]} intensity={2.3} color="#fff0d7" castShadow shadow-mapSize={[4096, 4096]} shadow-camera-left={-24} shadow-camera-right={24} shadow-camera-top={20} shadow-camera-bottom={-20} shadow-normalBias={0.035}/>
    {walls.map(wall => <WallSurface key={wall.id} material={wallMaterial(wall)} wall={wall} plaster={wall.room === 'sienna' ? textures.damask : textures.plaster}/>)}
    {rooms.filter(room => room.floorY === 0 && room.id !== 'sienna').map(room => <group key={room.id} position={[room.center[0], 0, room.center[1]]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[room.size[0] / 2, 0.15, room.size[1] / 2]} position={[0, 5.9, 0]}/>
      </RigidBody>
      <RoomFloor room={room} stone={textures.stone} wood={textures.wood} glass={glass.lobby}/>
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
    <LodgeWindow material={lodgeWood} glass={glass.cabin}/>
    <LodgeCorridorRoute material={castleStone}/>
    <VesperOrnaments/>
    <SiennaRoom wood={textures.wood}/>
    <GalleryStairs/>
    <MoonfallRoom stone={textures.stone}/>
    <OculusRoom material={oculusMaterial}/>

  </>
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
