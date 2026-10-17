import type {Wall} from '#src/lib/gallery.ts'

import {useThree} from '@react-three/fiber'
import {CuboidCollider, RigidBody} from '@react-three/rapier'
import Branch from 'branch-component'
import renderCanvasTexture from 'canvas-textures/three'
import useDisposable from 'disposable-lifetime/react'
import {useEffect, useMemo} from 'react'
import {EquirectangularReflectionMapping, MeshStandardNodeMaterial, SRGBColorSpace} from 'three/webgpu'
import useGraphicsMode from 'use-graphics-mode'

import DineLights from '#component/levels/gallery/DineLights'
import Fountain from '#component/levels/gallery/Fountain'
import FountainBenches from '#component/levels/gallery/FountainBenches'
import GalleryStairs from '#component/levels/gallery/GalleryStairs'
import LobbyCeiling from '#component/levels/gallery/LobbyCeiling'
import LobbyFloor from '#component/levels/gallery/LobbyFloor'
import LodgeCorridorRoute from '#component/levels/gallery/LodgeCorridorRoute'
import LodgeRoom from '#component/levels/gallery/LodgeRoom'
import LodgeWindow from '#component/levels/gallery/LodgeWindow'
import MoonfallRoom from '#component/levels/gallery/MoonfallRoom'
import OculusRoom from '#component/levels/gallery/OculusRoom'
import PottedPlants from '#component/levels/gallery/PottedPlants'
import RoomFloor from '#component/levels/gallery/RoomFloor'
import SalonRoom from '#component/levels/gallery/SalonRoom'
import SiennaRoom from '#component/levels/gallery/SiennaRoom'
import {damaskTexture, surfaceTexture} from '#src/components/Scene/materials.ts'
import Box from '#src/components/Scene/primitives.tsx'
import WallSurface from '#src/components/Scene/WallSurface.tsx'
import {rooms, walls} from '#src/lib/gallery.ts'
import {wallTop} from '#src/lib/gallery/architecture.ts'
import {createArchitecturalGlassMaterials, disposeArchitecturalGlassMaterials} from '#src/lib/materials/ArchitecturalGlassMaterials.ts'
import CastleStoneMaterial from '#src/lib/materials/CastleStoneMaterial.ts'
import {corridorLanterns, lightIndoors, lodgeWindowLights} from '#src/lib/materials/lights/index.ts'
import LodgeMaterials from '#src/lib/materials/LodgeMaterials.ts'
import LodgeWoodMaterial from '#src/lib/materials/LodgeWoodMaterial.ts'
import {TravertineWallMaterial} from '#src/lib/materials/travertine/index.ts'
import VesperWallMaterial from '#src/lib/materials/VesperWallMaterial.ts'

const pointLightPositions: Partial<Record<Wall['room'], Array<number>>> = {
  antechamber: [0],
}
// These rooms are lit by breakable LED panes with their own dimming lights instead of the fixed light boxes.
const ledRooms = new Set<Wall['room']>(['dine'])
// The Lobby keeps the shared slab but builds its own coffered laylight ceiling and the lamps under it.
const cofferedRooms = new Set<Wall['room']>(['lobby'])
// These upper rooms build their own floor, ceiling and lights.
const customRooms = new Set<Wall['room']>(['salon', 'sienna'])
const vesper = rooms.find(room => room.id === 'vesper')!
// Five courses of 1.1 m reach the cornice; slabs are twice as long as they are high.
const lobbyCladding = {
  course: 1.1,
  length: 2.2,
}

export default function Architecture() {
  const isHeavy = useGraphicsMode()
  const glass = useDisposable(useMemo(() => {
    const materials = createArchitecturalGlassMaterials(isHeavy)
    return {
      ...materials,
      dispose: () => disposeArchitecturalGlassMaterials(materials),
    }
  }, [isHeavy]))
  // The Lodge, its tunnel and the corridor run underground, beyond the reach of the sun.
  const castleStone = useDisposable(useMemo(() => lightIndoors(new CastleStoneMaterial), []))
  // The corridor and its stairs see nothing but their own lanterns.
  const corridorWood = useDisposable(useMemo(() => corridorLanterns.adopt(new LodgeWoodMaterial), []))
  const windowReveal = useDisposable(useMemo(() => lodgeWindowLights.adopt(new LodgeWoodMaterial), []))
  const lodgeMaterials = useDisposable(useMemo(() => new LodgeMaterials, []))
  const vesperWall = useDisposable(useMemo(() => new VesperWallMaterial({
    center: vesper.center,
    size: vesper.size,
  }), []))
  // The Lobby’s walls are clad in slabs; its baseboards, cornice, pilasters and reveals are carved from the same stone without joints.
  const lobbyWall = useDisposable(useMemo(() => new TravertineWallMaterial({cladding: lobbyCladding}), []))
  const lobbyTrim = useDisposable(useMemo(() => new TravertineWallMaterial, []))
  const stone = useDisposable(useMemo(() => surfaceTexture('stone'), []))
  const plaster = useDisposable(useMemo(() => surfaceTexture('plaster'), []))
  const wood = useDisposable(useMemo(() => surfaceTexture('wood'), []))
  const damask = useDisposable(useMemo(() => damaskTexture(rooms.find(room => room.id === 'sienna')!.size[0], wallTop), []))
  const oculusMaterial = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    map: stone,
    color: '#4c5558',
    roughness: 0.95,
    envMapIntensity: 0,
  }), [stone]))
  const wallMaterial = (wall: Wall) => {
    if (wall.room === 'oculus') {
      return oculusMaterial
    }
    if (wall.room === 'lodge') {
      return wall.id.startsWith('lodge-tunnel-') ? castleStone : lodgeMaterials.timber
    }
    if (wall.room === 'corridor') {
      return corridorWood
    }
    if (wall.room === 'lobby') {
      return lobbyTrim
    }
  }
  const surfaceMaterial = (wall: Wall) => {
    if (isLodgeRoomWall(wall)) {
      return lodgeMaterials.logWall
    }
    if (wall.room === 'vesper') {
      return vesperWall
    }
    if (wall.room === 'lobby') {
      return lobbyWall
    }
  }
  return <>
    <ReflectionEnvironment />
    <color args={['#ded8ca']} attach='background' />
    <ambientLight intensity={0.65} /><hemisphereLight args={['#ecf3ff', '#a29270', 1.15]} />
    <directionalLight castShadow color='#fff0d7' intensity={2.3} position={[-3, 9, 4]} shadow-camera-bottom={-20} shadow-camera-left={-24} shadow-camera-right={24} shadow-camera-top={20} shadow-mapSize={[4096, 4096]} shadow-normalBias={0.035} />
    {walls.map(wall => <WallSurface key={wall.id} glass={glass.tunnel} material={wallMaterial(wall)} plaster={wall.room === 'sienna' ? damask : plaster} surfaceMaterial={surfaceMaterial(wall)} wall={wall} />)}
    {rooms.filter(room => room.floorY === 0 && !customRooms.has(room.id)).map(room => <group key={room.id} position={[room.center[0], 0, room.center[1]]}>
      <RigidBody colliders={false} type='fixed'>
        <CuboidCollider args={[room.size[0] / 2, 0.15, room.size[1] / 2]} position={[0, 5.9, 0]} />
      </RigidBody>
      <Branch if={room.id === 'lobby'} else={<RoomFloor glass={glass.lobby} room={room} stone={stone} wood={wood} />}><LobbyFloor glass={glass.lobby} room={room} stone={stone} wood={wood} /></Branch>
      <Box color={room.id === 'vesper' ? '#7c9586' : '#e1dccc'} position={[0, 5.78, 0]} size={[room.size[0], 0.18, room.size[1]]} />
      {lightBoxOffsets(room).map(z => <group key={z}>
        <Box color='#a29982' position={[0, 5.6, z]} size={[room.size[0] * 0.48, 0.1, 2.6]} />
        <mesh position={[0, 5.54, z]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[room.size[0] * 0.48 - 0.1, 2.45]} /><meshBasicNodeMaterial color='#fff3d8' /></mesh>
        {[-1, 0, 1].map(x => <Box key={x} color='#c0b7a1' position={[x * room.size[0] * 0.12, 5.5, z]} size={[0.045, 0.12, 2.5]} />)}
      </group>)}
      <Branch if={cofferedRooms.has(room.id)} then={LobbyCeiling} />
      {(ledRooms.has(room.id) || cofferedRooms.has(room.id) ? [] : pointLightPositions[room.id] ?? [-3.5, 3.5]).map(z => <pointLight key={z} color='#fff1d8' decay={2} distance={14} intensity={room.id === 'vesper' ? 40 : 32} position={[0, 4.9, z]} />)}
    </group>)}
    <DineLights />
    <PottedPlants />
    <Fountain />
    <FountainBenches wood={wood} />
    <LodgeRoom materials={lodgeMaterials} />
    <LodgeWindow glass={glass.cabin} material={windowReveal} />
    <LodgeCorridorRoute corridorLining={corridorWood} material={castleStone} />
    <SiennaRoom wood={wood} />
    <SalonRoom glass={glass.lobby} stone={stone} wood={wood} />
    <GalleryStairs />
    <MoonfallRoom stone={stone} />
    <OculusRoom material={oculusMaterial} />

  </>
}

/** The Lodge’s own four walls get log courses; its tunnel keeps the castle stone. */
function isLodgeRoomWall(wall: Wall) {
  return wall.room === 'lodge' && !wall.id.startsWith('lodge-tunnel-')
}
/** Z offsets of the recessed light boxes: one every 4 m along the room’s depth, none where LED panes or laylights take over. */
function lightBoxOffsets(room: typeof rooms[number]) {
  if (ledRooms.has(room.id) || cofferedRooms.has(room.id)) {
    return []
  }
  if (room.id === 'antechamber') {
    return [0]
  }
  return Array.from({length: room.size[1] / 4 - 1}, (_, i) => i * 4 - room.size[1] / 2 + 4)
}
function ReflectionEnvironment() {
  const scene = useThree(s => s.scene)
  useEffect(() => {
    const texture = renderCanvasTexture({
      width: 1024,
      height: 512,
      draw(context) {
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
      },
    })
    texture.mapping = EquirectangularReflectionMapping
    texture.colorSpace = SRGBColorSpace
    const previous = scene.environment
    // eslint-disable-next-line react-hooks/immutability -- R3F expects the scene environment to be set from an effect; the cleanup restores it.
    scene.environment = texture
    scene.environmentIntensity = 0.5
    return () => {
      scene.environment = previous
      texture.dispose()
    }
  }, [scene])
  return null
}
