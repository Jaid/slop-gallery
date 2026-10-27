import type {RoomId} from '#src/rooms/index.ts'

/** the floor mirrors of the gallery: one for the floors of the ground level and one for the Moonfall’s slate */
export type FloorMirror = 'base' | 'moonfall'
/** what stays on beyond a room’s own objects while the player is inside it */
export type RoomRelations = {
  /** the floor mirror to render, none if left out */
  floorMirror?: FloorMirror
  /** global ids of other rooms’ lamps and ambience emitters that stay on, because they reach into this room or can be seen from it */
  keep: ReadonlyArray<string>
}

/**
 * Per room, a whitelist of neighbor objects. While the player is in a room, every other room’s lamps and ambience emitters are off unless the room keeps them here.
 * A room’s own lamps and ambience emitters are always on inside it.
 */
export default {
  lobby: {
    floorMirror: 'base',
    keep: [
      'vesper-ceiling_north',
      'vesper-ceiling_south',
      'dine-led_north',
      'dine-led_middle',
      'dine-led_south',
      'sienna-chandelier',
    ],
  },
  vesper: {
    floorMirror: 'base',
    keep: [
      'lobby-chandelier_north',
      'lobby-chandelier_middle',
      'lobby-chandelier_south',
      'dine-led_north',
      'dine-led_middle',
      'dine-led_south',
      'sienna-chandelier',
    ],
  },
  dine: {
    floorMirror: 'base',
    keep: [
      'lobby-chandelier_north',
      'lobby-chandelier_middle',
      'lobby-chandelier_south',
      'vesper-ceiling_north',
      'vesper-ceiling_south',
    ],
  },
  antechamber: {
    floorMirror: 'base',
    keep: [
      'lobby-chandelier_north',
      'lobby-chandelier_middle',
      'lobby-chandelier_south',
      'vesper-ceiling_north',
      'vesper-ceiling_south',
      'dine-led_north',
      'dine-led_middle',
      'dine-led_south',
      'oculus-tunnel_green',
      'oculus-tunnel_blue',
      'oculus-tunnel_red',
    ],
  },
  sienna: {
    keep: [
      'lobby-chandelier_north',
      'lobby-chandelier_middle',
      'lobby-chandelier_south',
      'vesper-ceiling_north',
      'vesper-ceiling_south',
      'corridor-lantern_north',
      'corridor-lantern_middle',
      'corridor-lantern_south',
    ],
  },
  moonfall: {
    floorMirror: 'moonfall',
    keep: [
      'lobby-chandelier_north',
      'lobby-chandelier_middle',
      'lobby-chandelier_south',
      'oculus-tunnel_green',
      'oculus-tunnel_blue',
      'oculus-tunnel_red',
    ],
  },
  oculus: {
    keep: [
      'vesper-ceiling_north',
      'vesper-ceiling_south',
      'dine-led_north',
      'dine-led_middle',
      'dine-led_south',
      'moonfall-wall_west_1',
      'moonfall-wall_west_2',
      'moonfall-wall_west_3',
      'moonfall-wall_west_4',
      'moonfall-wall_east_north',
      'moonfall-wall_east_south',
      'moonfall-spotlight',
      'moonfall-planet_glow',
      'moonfall-ember',
    ],
  },
  lodge: {
    keep: [
      'oculus-tunnel_green',
      'oculus-tunnel_blue',
      'oculus-tunnel_red',
      'corridor-lantern_north',
      'corridor-lantern_middle',
      'corridor-lantern_south',
    ],
  },
  corridor: {
    keep: [
      'vesper-ceiling_north',
      'vesper-ceiling_south',
      'sienna-chandelier',
      'lodge-fire',
      'lodge-chandelier',
    ],
  },
  salon: {
    floorMirror: 'base',
    keep: [
      'vesper-ceiling_north',
      'vesper-ceiling_south',
      'dine-led_north',
      'dine-led_middle',
      'dine-led_south',
    ],
  },
} satisfies Record<RoomId, RoomRelations>
