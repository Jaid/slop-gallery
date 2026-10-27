import type {Wall} from '#src/lib/gallery.ts'

import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'
import useGraphicsMode, {useGraphicsModeValue} from 'use-graphics-mode'

import GalleryLighting from '#component/levels/gallery/GalleryLighting'
import GalleryStairs from '#component/levels/gallery/GalleryStairs'
import LodgeWindow from '#component/levels/gallery/LodgeWindow'
import PottedPlants from '#component/levels/gallery/PottedPlants'
import SalonWindow from '#component/levels/gallery/SalonWindow'
import {surfaceTexture} from '#src/components/Scene/materials.ts'
import WallSurface from '#src/components/Scene/WallSurface.tsx'
import {rooms, walls} from '#src/lib/gallery.ts'
import {createArchitecturalGlassMaterials, disposeArchitecturalGlassMaterials} from '#src/lib/materials/ArchitecturalGlassMaterials.ts'
import CastleStoneMaterial from '#src/lib/materials/CastleStoneMaterial.ts'
import DamaskWallpaperMaterial from '#src/lib/materials/DamaskWallpaperMaterial.ts'
import DineMaterials from '#src/lib/materials/DineMaterials.ts'
import JoineryWoodMaterial from '#src/lib/materials/JoineryWoodMaterial.ts'
import {lightIndoors} from '#src/lib/materials/lights/index.ts'
import LodgeMaterials from '#src/lib/materials/LodgeMaterials.ts'
import LodgeWoodMaterial from '#src/lib/materials/LodgeWoodMaterial.ts'
import {TravertineWallMaterial} from '#src/lib/materials/travertine/index.ts'
import VesperWallMaterial from '#src/lib/materials/VesperWallMaterial.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsMode.ts'
import AntechamberRoom from '#src/rooms/antechamber/components/AntechamberRoom/index.tsx'
import CorridorRoom from '#src/rooms/corridor/components/CorridorRoom/index.tsx'
import DineRoom from '#src/rooms/dine/components/DineRoom/index.tsx'
import LobbyRoom from '#src/rooms/lobby/components/LobbyRoom/index.tsx'
import LodgeRoom from '#src/rooms/lodge/components/LodgeRoom/index.tsx'
import LodgeTunnel from '#src/rooms/lodge/components/LodgeTunnel/index.tsx'
import MoonfallRoom from '#src/rooms/moonfall/components/MoonfallRoom/index.tsx'
import OculusRoom from '#src/rooms/oculus/components/OculusRoom/index.tsx'
import SalonRoom from '#src/rooms/salon/components/SalonRoom/index.tsx'
import SiennaRoom from '#src/rooms/sienna/components/SiennaRoom/index.tsx'
import VesperRoom from '#src/rooms/vesper/components/VesperRoom/index.tsx'

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
  const corridorWood = useDisposable(useMemo(() => lightIndoors(new LodgeWoodMaterial), []))
  const windowReveal = useDisposable(useMemo(() => lightIndoors(new LodgeWoodMaterial), []))
  const lodgeMaterials = useDisposable(useMemo(() => new LodgeMaterials, []))
  const vesperWall = useDisposable(useMemo(() => new VesperWallMaterial({
    center: vesper.center,
    size: vesper.size,
  }), []))
  // The Lobby’s walls are clad in slabs; its baseboards, cornice, pilasters and reveals are carved from the same stone without joints.
  const lobbyWall = useDisposable(useMemo(() => new TravertineWallMaterial({cladding: lobbyCladding}), []))
  const lobbyTrim = useDisposable(useMemo(() => new TravertineWallMaterial, []))
  const {surfaceAnisotropy} = useGraphicsModeValue(getGraphicsProfile)
  const stone = useDisposable(useMemo(() => surfaceTexture('stone', surfaceAnisotropy), [surfaceAnisotropy]))
  const plaster = useDisposable(useMemo(() => surfaceTexture('plaster', surfaceAnisotropy), [surfaceAnisotropy]))
  const wood = useDisposable(useMemo(() => surfaceTexture('wood', surfaceAnisotropy), [surfaceAnisotropy]))
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
    <GalleryLighting />
    {walls.map(wall => <WallSurface key={wall.id} glass={glass.tunnel} material={wallMaterial(wall)} plaster={plaster} surfaceMaterial={surfaceMaterial(wall)} wall={wall} />)}
    <LobbyRoom cladding={lobbyWall} glass={glass.lobby} stone={stone} wood={wood} />
    <VesperRoom glass={glass.lobby} stone={stone} wood={wood} />
    <DineRoom glass={glass.lobby} stone={stone} wood={wood} />
    <AntechamberRoom glass={glass.lobby} stone={stone} wood={wood} />
    <PottedPlants />
    <LodgeRoom materials={lodgeMaterials} />
    <LodgeWindow glass={glass.cabin} material={windowReveal} />
    <LodgeTunnel material={castleStone} wood={wood} />
    <CorridorRoom lining={corridorWood} wood={wood} />
    <SiennaRoom joinery={joinery} />
    <SalonRoom glass={glass.lobby} stone={stone} wood={wood} />
    <SalonWindow glass={glass.salon} />
    <GalleryStairs />
    <MoonfallRoom stone={stone} />
    <OculusRoom material={oculusMaterial} />
  </>
}

/** The Lodge’s own four walls get log courses; its tunnel keeps the castle stone. */
function isLodgeRoomWall(wall: Wall) {
  return wall.room === 'lodge' && !wall.id.startsWith('lodge-tunnel-')
}
