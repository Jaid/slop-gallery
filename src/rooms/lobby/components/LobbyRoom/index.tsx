import type {NodeMaterial} from 'three/webgpu'

import Fountain from '#component/levels/gallery/Fountain'
import FountainBenches from '#component/levels/gallery/FountainBenches'
import LobbyFloor from '#component/levels/gallery/LobbyFloor'
import LobbyVault from '#component/levels/gallery/LobbyVault'
import {rooms} from '#src/lib/gallery.ts'

const room = rooms.find(candidate => candidate.id === 'lobby')!

/** The Lobby has no flat ceiling: its coffered vault rises above the walls, lit by its chandeliers and the sun. */
export default function LobbyRoom({cladding, glass, stone, wood}: Omit<Parameters<typeof LobbyFloor>[0], 'room'> & {
  /** the travertine slabs of the walls, which the vault continues */
  cladding: NodeMaterial
}) {
  return <>
    <group name='lobby-room' position={[room.center[0], 0, room.center[1]]}>
      <LobbyFloor glass={glass} room={room} stone={stone} wood={wood} />
      <LobbyVault cladding={cladding} />
    </group>
    <Fountain />
    <FountainBenches wood={wood} />
  </>
}
