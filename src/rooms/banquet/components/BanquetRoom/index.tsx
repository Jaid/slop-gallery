import {CuboidCollider, RigidBody} from '@react-three/rapier'
import {useState} from 'react'

import BanquetFloor from '#component/BanquetFloor'
import CeilingLeds from '#component/CeilingLeds'
import LightSwitch from '#component/LightSwitch'
import Box from '#src/components/Scene/primitives.tsx'
import {useGallery} from '#src/lib/gallery.ts'
import {wallFace} from '#src/lib/gallery/architectureDimensions.ts'
import {banquetLedSlots} from '#src/lib/gallery/banquet.ts'
import lamps from '#src/rooms/banquet/lamps.ts'
import walls, {lightSwitchSpot} from '#src/rooms/banquet/walls.ts'
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
  // A new game switches the lights back on.
  const resetEpoch = useGallery(state => state.resetEpoch)
  return <>
    <group name='banquet-room' position={[room.center[0], 0, room.center[1]]}>
      <RigidBody colliders={false} type='fixed'>
        <CuboidCollider args={[width / 2, 0.15, depth / 2]} position={[0, room.height + 0.1, 0]} />
      </RigidBody>
      <Box color='#e1dccc' position={[0, room.height - 0.02, 0]} size={[width, 0.18, depth]} />
      <BanquetFloor glass={glass} room={room} stone={stone} wood={wood} />
    </group>
    <BanquetLights key={resetEpoch} />
  </>
}

/** The LED panes and the switch beside the Lobby arch that turns them on and off. */
function BanquetLights() {
  const [on, setOn] = useState(true)
  const wall = walls.west
  return <>
    <CeilingLeds lamps={leds} name='banquet' powered={on} slots={banquetLedSlots} />
    <group position={[room.center[0] + wall.center[0], room.floorY + wall.center[1], room.center[1] + wall.center[2]]} rotation={[0, wall.rotation, 0]}>
      <LightSwitch id={room.room.globalId('light_switch')} name='banquet-light-switch' on={on} position={[lightSwitchSpot.u, lightSwitchSpot.y, wallFace]} onToggle={() => setOn(!on)} />
    </group>
  </>
}
