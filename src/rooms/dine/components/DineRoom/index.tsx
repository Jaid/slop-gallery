import {CuboidCollider, RigidBody} from '@react-three/rapier'

import CeilingLeds from '#component/levels/gallery/CeilingLeds'
import DineFloor from '#component/levels/gallery/DineFloor'
import Box from '#src/components/Scene/primitives.tsx'
import {rooms} from '#src/lib/gallery.ts'
import {dineLedLight, dineLedSlots} from '#src/lib/gallery/dine.ts'
import {seenFrom} from '#src/lib/gallery/roomVisibility.ts'

const room = rooms.find(candidate => candidate.id === 'dine')!
const [width, depth] = room.size

/** Lit by breakable LED panes with their own dimming lights instead of fixed light boxes. */
export default function DineRoom({glass, stone, wood}: Omit<Parameters<typeof DineFloor>[0], 'room'>) {
  return <>
    <group name='dine-room' position={[room.center[0], 0, room.center[1]]}>
      <RigidBody colliders={false} type='fixed'>
        <CuboidCollider args={[width / 2, 0.15, depth / 2]} position={[0, room.height + 0.1, 0]} />
      </RigidBody>
      <Box color='#e1dccc' position={[0, room.height - 0.02, 0]} size={[width, 0.18, depth]} />
      <DineFloor glass={glass} room={room} stone={stone} wood={wood} />
    </group>
    <CeilingLeds light={dineLedLight} name='dine' optional rooms={seenFrom('dine')} slots={dineLedSlots} />
  </>
}
