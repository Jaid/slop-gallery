import type {Lamp} from '../base/Room.ts'
import type {Vec3} from 'math'

import fire from '#src/lib/gallery/fireplace/config.ts'
import lodgeInterior from '#src/lib/gallery/lodgeInterior/layout.ts'

const {chandelier} = lodgeInterior
/** A point of the fire, in the fireplace turned by 180° to face the room, in the room’s frame. */
const fromFire = ([x, y, z]: Vec3): Vec3 => [-(fire.position[0] + x), fire.position[1] + y, -(fire.position[2] + z)]

export default {
  // High above the front log, flickering around an average of 90%. Fast graphics, which have no flames, let it glow lower and steadier from the ember bed instead.
  fire: {
    position: fromFire(fire.light.position),
    strength: 68,
    tint: '#ffb45b',
    range: 10,
    shadow: 'heavy',
  },
  // In the candle plane of the wagon wheel, below its rim, so the iron never shadows its own light. It hangs from the boss in the middle of the north bay’s mouth, and lets heavy graphics ground the furniture with shadows.
  chandelier: {
    position: [chandelier.position[0], chandelier.position[1] + chandelier.lightY, chandelier.position[2]],
    strength: 20,
    tint: '#ffc68a',
    // far enough to reach into the bay’s corners
    range: 7,
    decay: 1.25,
    shadow: 'heavy',
  },
} satisfies Record<string, Lamp>
