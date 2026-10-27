import type {RoomId} from '#src/rooms/index.ts'

/** the floor mirrors of the gallery: one for the floors of the ground level and one for the Moonfall’s slate */
export type FloorMirror = 'base' | 'moonfall'
/** what stays on beyond a room’s own objects while the player is inside it */
export type RoomRelations = {
  /** the floor mirror to render, none if left out */
  floorMirror?: FloorMirror
  /** global ids of other rooms’ lamps and ambience emitters that stay on, because they reach into this room or can be seen from it */
  keep: ReadonlyArray<string>
  /** the other rooms whose models stay enabled: the rooms a player can see into through up to two openings, by casting rays through them; the frustum still culls them per frame */
  rooms: ReadonlyArray<RoomId>
}

/** an opening between two rooms: the holes of the walls it passes through, by global wall id and hole index */
export type Opening = {
  holes: ReadonlyArray<readonly [string, number]>
  rooms: readonly [RoomId, RoomId]
}

/** the openings between rooms that RoomCulling looks through, as global wall ids with an index into their holes; passages list the holes at both of their ends. The glazed Lobby floor into the Oculus is an opening too, but takes its box from the Lobby’s floor. */
export const openings: ReadonlyArray<Opening> = [
  {
    rooms: ['lobby', 'vesper'],
    holes: [['lobby-west', 0]],
  },
  {
    rooms: ['lobby', 'dine'],
    holes: [['lobby-east', 0]],
  },
  {
    rooms: ['lobby', 'antechamber'],
    holes: [['lobby-south', 0]],
  },
  {
    rooms: ['vesper', 'sienna'],
    holes: [['vesper-south', 0]],
  },
  {
    rooms: ['dine', 'salon'],
    holes: [['dine-north', 0]],
  },
  {
    rooms: ['antechamber', 'moonfall'],
    holes: [['antechamber-east', 0], ['moonfall-east', 0]],
  },
  {
    rooms: ['sienna', 'corridor'],
    holes: [['sienna-west', 0]],
  },
  {
    rooms: ['moonfall', 'oculus'],
    holes: [['moonfall-north', 0], ['oculus-south', 0]],
  },
  {
    rooms: ['oculus', 'lodge'],
    holes: [['oculus-north', 0], ['lodge-east', 0]],
  },
  {
    rooms: ['lodge', 'corridor'],
    holes: [['lodge-west', 0]],
  },
  {
    rooms: ['lodge', 'corridor'],
    holes: [['lodge-west', 1], ['corridor-wall-5', 0]],
  },
  {
    // The glass wall between the Lobby extension and the Salon.
    rooms: ['lobby', 'salon'],
    holes: [['lobby-extension-east', 0], ['salon-west', 0]],
  },
]

/**
 * Per room, a whitelist of neighbor objects. While the player is in a room, every other room’s models are hidden and its lamps and ambience emitters are off unless the room lists them here.
 * A room’s own models, lamps and ambience emitters are always on inside it. Hiding a model only skips its draws, and switching a lamp off only dims it, so neither recompiles a shader.
 */
const relations = {
  lobby: {
    rooms: ['vesper', 'dine', 'antechamber', 'salon', 'oculus', 'sienna'],
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
    rooms: ['lobby', 'sienna', 'dine', 'antechamber', 'salon', 'corridor'],
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
    rooms: ['lobby', 'salon', 'vesper', 'antechamber'],
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
    rooms: ['lobby', 'moonfall', 'vesper', 'dine', 'salon', 'oculus'],
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
      'moonfall-tunnel_green',
      'moonfall-tunnel_blue',
      'moonfall-tunnel_red',
      'moonfall-stairs',
    ],
  },
  sienna: {
    rooms: ['vesper', 'corridor', 'lobby'],
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
    rooms: ['antechamber', 'oculus'],
    floorMirror: 'moonfall',
    keep: [
      'lobby-chandelier_north',
      'lobby-chandelier_middle',
      'lobby-chandelier_south',
    ],
  },
  oculus: {
    rooms: ['moonfall', 'lodge', 'lobby', 'salon'],
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
      'moonfall-tunnel_green',
      'moonfall-tunnel_blue',
      'moonfall-tunnel_red',
      'moonfall-stairs',
      'lodge-tunnel_pendants',
    ],
  },
  lodge: {
    rooms: ['oculus', 'corridor'],
    keep: [
      'moonfall-tunnel_green',
      'moonfall-tunnel_blue',
      'moonfall-tunnel_red',
      'corridor-lantern_north',
      'corridor-lantern_middle',
      'corridor-lantern_south',
    ],
  },
  corridor: {
    rooms: ['sienna', 'lodge'],
    keep: [
      'vesper-ceiling_north',
      'vesper-ceiling_south',
      'sienna-chandelier',
      'lodge-fire',
      'lodge-chandelier',
    ],
  },
  salon: {
    rooms: ['dine', 'lobby', 'vesper', 'antechamber', 'oculus'],
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
const lit = new Map<string, ReadonlyArray<RoomId>>
/** The rooms lamps of a room stay on in: their own room and every room whose {@link RoomRelations.keep} lists one of their global ids. The same arguments always give the same list. */
export function litFrom(room: RoomId, ...lamps: ReadonlyArray<string>) {
  const key = [room, ...lamps].join()
  let result = lit.get(key)
  if (!result) {
    result = [room, ...Object.entries(relations).filter(([id, {keep}]) => id !== room && keep.some(lamp => lamps.includes(lamp))).map(([id]) => id as RoomId)]
    lit.set(key, result)
  }
  return result
}

export default relations
