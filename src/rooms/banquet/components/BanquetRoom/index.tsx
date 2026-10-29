import {CuboidCollider, RigidBody} from '@react-three/rapier'

import CeilingLeds from '#component/levels/gallery/CeilingLeds'
import BanquetFloor from '#component/levels/gallery/BanquetFloor'
import Box from '#src/components/Scene/primitives.tsx'
import {litFrom} from '#src/components/World/relations.ts'
import {rooms} from '#src/lib/gallery.ts'
import {banquetLedLight, banquetLedSlots} from '#src/lib/gallery/banquet.ts'

const room = rooms.find(candidate => candidate.id === 'banquet')!
const [width, depth] = room.size

/** Lit by breakable LED panes with their own dimming lights instead of fixed light boxes. */
export default function BanquetRoom({glass, stone, wood}: Omit<Parameters<typeof BanquetFloor>[0], 'room'>) {
  return <>
    <group name='banquet-room' position={[room.center[0], 0, room.center[1]]}>
      <RigidBody colliders={false} type='fixed'>
        <CuboidCollider args={[width / 2, 0.15, depth / 2]} position={[0, room.height + 0.1, 0]} />
      </RigidBody>
      <Box color='#e1dccc' position={[0, room.height - 0.02, 0]} size={[width, 0.18, depth]} />
      <BanquetFloor glass={glass} room={room} stone={stone} wood={wood} />
    </group>
    <CeilingLeds light={banquetLedLight} name='banquet' optional rooms={litFrom('banquet', 'banquet-led_north', 'banquet-led_middle', 'banquet-led_south')} slots={banquetLedSlots} />
  </>
}
