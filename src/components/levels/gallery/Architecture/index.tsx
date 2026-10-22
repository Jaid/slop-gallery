import type {Wall} from '#src/lib/gallery.ts'

import {useThree} from '@react-three/fiber'
import {CuboidCollider, RigidBody} from '@react-three/rapier'
import Branch from 'branch-component'
import renderCanvasTexture from 'canvas-textures/three'
import useDisposable from 'disposable-lifetime/react'
import {useLayoutEffect, useMemo} from 'react'
import {EquirectangularReflectionMapping, MeshStandardNodeMaterial, SRGBColorSpace} from 'three/webgpu'
import useGraphicsMode from 'use-graphics-mode'

import CeilingLeds from '#component/levels/gallery/CeilingLeds'
import DineFloor from '#component/levels/gallery/DineFloor'
import Fountain from '#component/levels/gallery/Fountain'
import FountainBenches from '#component/levels/gallery/FountainBenches'
import GalleryStairs from '#component/levels/gallery/GalleryStairs'
import LobbyFloor from '#component/levels/gallery/LobbyFloor'
import LobbyVault from '#component/levels/gallery/LobbyVault'
import LodgeCorridorRoute from '#component/levels/gallery/LodgeCorridorRoute'
import LodgeRoom from '#component/levels/gallery/LodgeRoom'
import LodgeWindow from '#component/levels/gallery/LodgeWindow'
import MoonfallRoom from '#component/levels/gallery/MoonfallRoom'
import OculusRoom from '#component/levels/gallery/OculusRoom'
import PottedPlants from '#component/levels/gallery/PottedPlants'
import RoomFloor from '#component/levels/gallery/RoomFloor'
import SalonRoom from '#component/levels/gallery/SalonRoom'
import SalonWindow from '#component/levels/gallery/SalonWindow'
import SiennaRoom from '#component/levels/gallery/SiennaRoom'
import {surfaceTexture} from '#src/components/Scene/materials.ts'
import Box from '#src/components/Scene/primitives.tsx'
import WallSurface from '#src/components/Scene/WallSurface.tsx'
import {rooms, walls} from '#src/lib/gallery.ts'
import {antechamberLedLight, antechamberLedSlots, dineLedLight, dineLedSlots} from '#src/lib/gallery/dine.ts'
import sun from '#src/lib/gallery/sun.ts'
import {createArchitecturalGlassMaterials, disposeArchitecturalGlassMaterials} from '#src/lib/materials/ArchitecturalGlassMaterials.ts'
import CastleStoneMaterial from '#src/lib/materials/CastleStoneMaterial.ts'
import DamaskWallpaperMaterial from '#src/lib/materials/DamaskWallpaperMaterial.ts'
import DineMaterials from '#src/lib/materials/DineMaterials.ts'
import JoineryWoodMaterial from '#src/lib/materials/JoineryWoodMaterial.ts'
import {corridorLanterns, lightIndoors, lodgeWindowLights} from '#src/lib/materials/lights/index.ts'
import LodgeMaterials from '#src/lib/materials/LodgeMaterials.ts'
import LodgeWoodMaterial from '#src/lib/materials/LodgeWoodMaterial.ts'
import proceduralSky from '#src/lib/materials/ProceduralSky.ts'
import {TravertineWallMaterial} from '#src/lib/materials/travertine/index.ts'
import VesperWallMaterial from '#src/lib/materials/VesperWallMaterial.ts'

// These rooms are lit by breakable LED panes with their own dimming lights instead of the fixed light boxes.
const ledRooms = new Set<Wall['room']>(['antechamber', 'dine'])
// The Lobby has no flat ceiling: its coffered vault rises above the walls, lit by its chandeliers and the sun.
const vaultedRooms = new Set<Wall['room']>(['lobby'])
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
  // The Sienna is papered in damask above dark wood: its baseboards, reveals, cornice, wainscot and joists share one varnished timber.
  const damask = useDisposable(useMemo(() => new DamaskWallpaperMaterial, []))
  const joineryX = useDisposable(useMemo(() => new JoineryWoodMaterial({grain: 'x'}), []))
  const joineryZ = useDisposable(useMemo(() => new JoineryWoodMaterial({
    grain: 'z',
    // The joists are left in their oiled, unvarnished state.
    roughness: 0.66,
  }), []))
  // The wainscot’s raised fields are a shade darker than their frames, so the paneling reads in depth.
  const joineryPanel = useDisposable(useMemo(() => new JoineryWoodMaterial({
    colors: {
      dark: '#1f0f07',
      light: '#432613',
      ring: '#120803',
    },
    seed: 3,
  }), []))
  const joinery = useMemo(() => ({
    panel: joineryPanel,
    x: joineryX,
    z: joineryZ,
  }), [joineryPanel, joineryX, joineryZ])
  // Dine’s walls are painted with gilt boiserie, laid out around each wall’s doorways.
  const dine = useDisposable(useMemo(() => new DineMaterials, []))
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
    if (wall.room === 'sienna') {
      return joineryX
    }
    return dine.trim(wall)
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
    if (wall.room === 'sienna') {
      return damask
    }
    return dine.surface(wall)
  }
  return <>
    <ReflectionEnvironment />
    <Sky />
    <ambientLight intensity={0.65} /><hemisphereLight args={['#ecf3ff', '#a29270', 1.15]} />
    <directionalLight castShadow color={sun.color} intensity={sun.intensity} position={sun.position} shadow-camera-bottom={sun.shadow.bottom} shadow-camera-far={sun.shadow.far} shadow-camera-left={sun.shadow.left} shadow-camera-near={sun.shadow.near} shadow-camera-right={sun.shadow.right} shadow-camera-top={sun.shadow.top} shadow-mapSize={[sun.shadow.mapSize, sun.shadow.mapSize]} shadow-normalBias={sun.shadow.normalBias} />
    {walls.map(wall => <WallSurface key={wall.id} glass={glass.tunnel} material={wallMaterial(wall)} plaster={plaster} surfaceMaterial={surfaceMaterial(wall)} wall={wall} />)}
    {rooms.filter(room => room.floorY === 0 && !customRooms.has(room.id)).map(room => <group key={room.id} position={[room.center[0], 0, room.center[1]]}>
      <Branch not={vaultedRooms.has(room.id)}>
        <RigidBody colliders={false} type='fixed'>
          <CuboidCollider args={[room.size[0] / 2, 0.15, room.size[1] / 2]} position={[0, room.height + 0.1, 0]} />
        </RigidBody>
        <Box color={room.id === 'vesper' ? '#7c9586' : '#e1dccc'} position={[0, room.height - 0.02, 0]} size={[room.size[0], 0.18, room.size[1]]} />
      </Branch>
      <RoomFloorFor glass={glass.lobby} room={room} stone={stone} wood={wood} />
      {lightBoxOffsets(room).map(z => <group key={z}>
        <Box color='#a29982' position={[0, 5.6, z]} size={[room.size[0] * 0.48, 0.1, 2.6]} />
        <mesh position={[0, 5.54, z]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[room.size[0] * 0.48 - 0.1, 2.45]} /><meshBasicNodeMaterial color='#fff3d8' /></mesh>
        {[-1, 0, 1].map(x => <Box key={x} color='#c0b7a1' position={[x * room.size[0] * 0.12, 5.5, z]} size={[0.045, 0.12, 2.5]} />)}
      </group>)}
      <Branch if={vaultedRooms.has(room.id)}><LobbyVault cladding={lobbyWall} /></Branch>
      {(ledRooms.has(room.id) || vaultedRooms.has(room.id) ? [] : [-3.5, 3.5]).map(z => <pointLight key={z} color='#fff1d8' decay={2} distance={14} intensity={room.id === 'vesper' ? 40 : 32} position={[0, 4.9, z]} />)}
    </group>)}
    <CeilingLeds light={dineLedLight} name='dine' slots={dineLedSlots} />
    <CeilingLeds light={antechamberLedLight} name='antechamber' slots={antechamberLedSlots} />
    <PottedPlants />
    <Fountain />
    <FountainBenches wood={wood} />
    <LodgeRoom materials={lodgeMaterials} />
    <LodgeWindow glass={glass.cabin} material={windowReveal} />
    <LodgeCorridorRoute corridorLining={corridorWood} material={castleStone} />
    <SiennaRoom joinery={joinery} />
    <SalonRoom glass={glass.lobby} stone={stone} wood={wood} />
    <SalonWindow glass={glass.salon} />
    <GalleryStairs />
    <MoonfallRoom stone={stone} />
    <OculusRoom material={oculusMaterial} />

  </>
}

/** The floor of an upper room without a custom room component: the Lobby and Dine lay their own stone, the others share the default slabs. */
function RoomFloorFor(props: Parameters<typeof RoomFloor>[0]) {
  if (props.room.id === 'lobby') {
    return <LobbyFloor {...props} />
  }
  if (props.room.id === 'dine') {
    return <DineFloor {...props} />
  }
  return <RoomFloor {...props} />
}
/** The Lodge’s own four walls get log courses; its tunnel keeps the castle stone. */
function isLodgeRoomWall(wall: Wall) {
  return wall.room === 'lodge' && !wall.id.startsWith('lodge-tunnel-')
}
/** Z offsets of the recessed light boxes: one every 4 m along the room’s depth, none where LED panes or the vault’s chandeliers take over. */
function lightBoxOffsets(room: typeof rooms[number]) {
  if (ledRooms.has(room.id) || vaultedRooms.has(room.id)) {
    return []
  }
  return Array.from({length: room.size[1] / 4 - 1}, (_, i) => i * 4 - room.size[1] / 2 + 4)
}
/** The procedural daytime sky behind every glazed opening of the gallery, with its sun where the gallery’s sunlight comes from. */
function Sky() {
  const scene = useThree(s => s.scene)
  // Like the environment, the background is set before the first frame, so the pipelines are compiled once.
  useLayoutEffect(() => {
    const previous = scene.backgroundNode
    // eslint-disable-next-line react-hooks/immutability -- the scene background belongs to the level; the cleanup restores it.
    scene.backgroundNode = proceduralSky({sunDirection: sun.direction})
    return () => {
      scene.backgroundNode = previous
    }
  }, [scene])
  return null
}
function ReflectionEnvironment() {
  const scene = useThree(s => s.scene)
  // The environment is part of every lit material’s cache key. Set after the first frame, it would build all of them a second time.
  useLayoutEffect(() => {
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
