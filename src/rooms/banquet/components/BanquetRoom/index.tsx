import {CuboidCollider, RigidBody} from '@react-three/rapier'

import BanquetFloor from '#component/BanquetFloor'
import CeilingLeds from '#component/CeilingLeds'
import Box from '#src/components/Scene/primitives.tsx'
import {banquetLedSlots} from '#src/lib/gallery/banquet.ts'
import lamps from '#src/rooms/banquet/lamps.ts'
import slopGallery from '#src/worlds/gallery/index.ts'

const room = slopGallery.room('banquet')
const [width, depth] = room.size
/** the lamps under the panes, from north to south like the panes */
const leds = (['led_north', 'led_middle', 'led_south'] as const).map(id => ({
  id: `banquet-${id}`,
  strength: lamps[id].strength,
}))

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
    <CeilingLeds lamps={leds} name='banquet' slots={banquetLedSlots} />
  </>
}
