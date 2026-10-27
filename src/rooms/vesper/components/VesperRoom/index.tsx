import {CuboidCollider, RigidBody} from '@react-three/rapier'

import RoomFloor from '#component/levels/gallery/RoomFloor'
import Box from '#src/components/Scene/primitives.tsx'
import {litFrom} from '#src/components/World/relations.ts'
import {rooms} from '#src/lib/gallery.ts'

const room = rooms.find(candidate => candidate.id === 'vesper')!
const [width, depth] = room.size
/** z offsets of the recessed light boxes, one every 4 m along the room’s depth */
const lightBoxZs = Array.from({length: depth / 4 - 1}, (_, i) => i * 4 - depth / 2 + 4)
const vesperLightRooms = litFrom('vesper', 'vesper-ceiling_north', 'vesper-ceiling_south')

export default function VesperRoom({glass, stone, wood}: Omit<Parameters<typeof RoomFloor>[0], 'room'>) {
  return <group name='vesper-room' position={[room.center[0], 0, room.center[1]]}>
    <RigidBody colliders={false} type='fixed'>
      <CuboidCollider args={[width / 2, 0.15, depth / 2]} position={[0, room.height + 0.1, 0]} />
    </RigidBody>
    <Box color='#7c9586' position={[0, room.height - 0.02, 0]} size={[width, 0.18, depth]} />
    <RoomFloor glass={glass} room={room} stone={stone} wood={wood} />
    {lightBoxZs.map(z => <group key={z}>
      <Box color='#a29982' position={[0, 5.6, z]} size={[width * 0.48, 0.1, 2.6]} />
      <mesh position={[0, 5.54, z]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[width * 0.48 - 0.1, 2.45]} /><meshBasicNodeMaterial color='#fff3d8' /></mesh>
      {[-1, 0, 1].map(x => <Box key={x} color='#c0b7a1' position={[x * width * 0.12, 5.5, z]} size={[0.045, 0.12, 2.5]} />)}
    </group>)}
    {[-3.5, 3.5].map(z => <pointLight key={z} color='#fff1d8' decay={2} distance={14} intensity={40} position={[0, 4.5, z]} userData={{rooms: vesperLightRooms}} />)}
  </group>
}
