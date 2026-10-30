import RoomFloor from '#component/RoomFloor'
import VesperCeiling from '#src/rooms/vesper/components/VesperCeiling/index.tsx'
import slopGallery from '#src/worlds/gallery/index.ts'

const room = slopGallery.room('vesper')

/** Opens up into a coved ceiling crowned by a glazed lantern instead of a flat ceiling, so the sun reaches inside. */
export default function VesperRoom({glass, stone, wood}: Omit<Parameters<typeof RoomFloor>[0], 'room'>) {
  return <group name='vesper-room' position={[room.center[0], 0, room.center[1]]}>
    <VesperCeiling size={room.size} />
    <RoomFloor glass={glass} room={room} stone={stone} wood={wood} />
  </group>
}
