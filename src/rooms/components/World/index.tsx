import type {createArchitecturalGlassMaterials} from '#src/lib/materials/ArchitecturalGlassMaterials.ts'
import type LodgeMaterials from '#src/lib/materials/LodgeMaterials.ts'
import type {NodeMaterial, Texture} from 'three/webgpu'

import LodgeWindow from '#component/levels/gallery/LodgeWindow'
import SalonWindow from '#component/levels/gallery/SalonWindow'
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

/** the materials the rooms share with each other and with the walls around them */
export type WorldMaterials = {
  castleStone: NodeMaterial
  corridorWood: NodeMaterial
  glass: ReturnType<typeof createArchitecturalGlassMaterials>
  joinery: Parameters<typeof SiennaRoom>[0]['joinery']
  lobbyWall: NodeMaterial
  lodge: LodgeMaterials
  oculus: NodeMaterial
  stone: Texture
  windowReveal: NodeMaterial
  wood: Texture
}

/** Every room of the gallery, each with what it builds beyond its walls. */
export default function World({castleStone, corridorWood, glass, joinery, lobbyWall, lodge, oculus, stone, windowReveal, wood}: WorldMaterials) {
  return <group name='world'>
    <LobbyRoom cladding={lobbyWall} glass={glass.lobby} stone={stone} wood={wood} />
    <VesperRoom glass={glass.lobby} stone={stone} wood={wood} />
    <DineRoom glass={glass.lobby} stone={stone} wood={wood} />
    <AntechamberRoom glass={glass.lobby} stone={stone} wood={wood} />
    <SiennaRoom joinery={joinery} />
    <SalonRoom glass={glass.lobby} stone={stone} wood={wood} />
    <SalonWindow glass={glass.salon} />
    <LodgeRoom materials={lodge} />
    <LodgeWindow glass={glass.cabin} material={windowReveal} />
    <LodgeTunnel material={castleStone} wood={wood} />
    <CorridorRoom lining={corridorWood} wood={wood} />
    <MoonfallRoom stone={stone} />
    <OculusRoom material={oculus} />
  </group>
}
