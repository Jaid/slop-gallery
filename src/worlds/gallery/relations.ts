import type {GalleryRoomId as RoomId} from './SlopGallery.ts'

/** the floor mirrors of the gallery: one for the floors of the ground level and one for the Moonfall’s slate */
export type FloorMirror = 'base' | 'moonfall'
/** what stays on beyond a room’s own objects while the player is inside it */
export type RoomRelations = {
  /** the floor mirror to render, none if left out */
  floorMirror?: FloorMirror
  /** global ids of other rooms’ lamps and ambience emitters that stay on, because they reach into this room or can be seen from it */
  keep: ReadonlyArray<string>
  /** the other rooms whose models stay enabled: the rooms a player can see into through up to three openings; the frustum still culls them per frame */
  rooms: ReadonlyArray<RoomId>
}

/** an opening between two rooms: the holes of the walls it passes through, by global wall id and the hole’s name within its wall */
export type Opening = {
  holes: ReadonlyArray<readonly [string, string]>
  rooms: readonly [RoomId, RoomId]
}

/** the openings between rooms that RoomCulling looks through, as global wall ids with the names of their holes; passages list the holes at both of their ends. The glazed Lobby floor into the Oculus is an opening too, but takes its box from the Lobby’s floor, and so is the Vesper’s lantern, which looks out onto the Lobby’s vault. */
export const openings: ReadonlyArray<Opening> = [
  {
    rooms: ['lobby', 'vesper'],
    holes: [['lobby-west', 'vesper']],
  },
  {
    rooms: ['lobby', 'banquet'],
    holes: [['lobby-east', 'banquet']],
  },
  {
    rooms: ['lobby', 'antechamber'],
    holes: [['lobby-south', 'antechamber']],
  },
  {
    rooms: ['vesper', 'sienna'],
    holes: [['vesper-south', 'sienna']],
  },
  {
    rooms: ['banquet', 'salon'],
    holes: [['banquet-north', 'salon']],
  },
  {
    rooms: ['antechamber', 'moonfall'],
    holes: [['antechamber-east', 'stairway'], ['moonfall-east', 'stairway']],
  },
  {
    rooms: ['sienna', 'corridor'],
    holes: [['sienna-west', 'corridor']],
  },
  {
    rooms: ['moonfall', 'exhibition'],
    holes: [['moonfall-north', 'exhibition']],
  },
  {
    rooms: ['exhibition', 'oculus'],
    holes: [['oculus-south', 'exhibition']],
  },
  {
    // The doors from the balcony onto the staff stairways down to the displays.
    rooms: ['oculus', 'exhibition'],
    holes: [['oculus-east', 'staff_door']],
  },
  {
    rooms: ['oculus', 'exhibition'],
    holes: [['oculus-west', 'staff_door']],
  },
  {
    rooms: ['oculus', 'fortress'],
    holes: [['oculus-north', 'fortress']],
  },
  {
    rooms: ['fortress', 'lodge'],
    holes: [['lodge-east', 'fortress']],
  },
  {
    rooms: ['lodge', 'corridor'],
    holes: [['lodge-west', 'corridor']],
  },
  {
    rooms: ['lodge', 'corridor'],
    holes: [['lodge-west', 'window'], ['corridor-wall_5', 'lodge_window']],
  },
  {
    // The glass wall between the Lobby extension and the Salon.
    rooms: ['lobby', 'salon'],
    holes: [['lobby-extension_east', 'salon_window'], ['salon-west', 'lobby_window']],
  },
]

/**
 * Per room, a whitelist of neighbor objects. While the player is in a room, every other room’s models are hidden and its lamps and ambience emitters are off unless the room lists them here.
 * A room’s own models, lamps and ambience emitters are always on inside it. Hiding a model only skips its draws, and switching a lamp off only dims it, so neither recompiles a shader.
 */
const relations = {
  lobby: {
    rooms: ['vesper', 'banquet', 'antechamber', 'salon', 'oculus', 'sienna', 'exhibition', 'fortress'],
    floorMirror: 'base',
    keep: [
      'banquet-led_north',
      'banquet-led_middle',
      'banquet-led_south',
      'sienna-chandelier',
    ],
  },
  vesper: {
    rooms: ['lobby', 'sienna', 'banquet', 'antechamber', 'salon', 'corridor', 'oculus'],
    floorMirror: 'base',
    keep: [
      'lobby-chandelier_north',
      'lobby-chandelier_middle',
      'lobby-chandelier_south',
      'banquet-led_north',
      'banquet-led_middle',
      'banquet-led_south',
      'sienna-chandelier',
    ],
  },
  banquet: {
    rooms: ['lobby', 'salon', 'vesper', 'antechamber', 'oculus'],
    floorMirror: 'base',
    keep: [
      'lobby-chandelier_north',
      'lobby-chandelier_middle',
      'lobby-chandelier_south',
    ],
  },
  antechamber: {
    rooms: ['lobby', 'moonfall', 'vesper', 'banquet', 'salon', 'oculus'],
    floorMirror: 'base',
    keep: [
      'lobby-chandelier_north',
      'lobby-chandelier_middle',
      'lobby-chandelier_south',
      'banquet-led_north',
      'banquet-led_middle',
      'banquet-led_south',
      'exhibition-tunnel_green',
      'exhibition-tunnel_blue',
      'exhibition-tunnel_red',
      'moonfall-stairs',
    ],
  },
  sienna: {
    rooms: ['vesper', 'corridor', 'lobby', 'salon'],
    keep: [
      'lobby-chandelier_north',
      'lobby-chandelier_middle',
      'lobby-chandelier_south',
      'corridor-lantern_north',
      'corridor-lantern_middle',
      'corridor-lantern_south',
    ],
  },
  salon: {
    rooms: ['banquet', 'lobby', 'vesper', 'antechamber', 'oculus', 'sienna', 'exhibition'],
    floorMirror: 'base',
    keep: [
      'banquet-led_north',
      'banquet-led_middle',
      'banquet-led_south',
    ],
  },
  moonfall: {
    rooms: ['antechamber', 'exhibition', 'oculus'],
    floorMirror: 'moonfall',
    // The tunnel’s lamps light the way up from Moonfall’s north wall.
    keep: [
      'lobby-chandelier_north',
      'lobby-chandelier_middle',
      'lobby-chandelier_south',
      'exhibition-tunnel_green',
      'exhibition-tunnel_blue',
      'exhibition-tunnel_red',
    ],
  },
  corridor: {
    rooms: ['sienna', 'lodge', 'vesper', 'fortress'],
    keep: [
      'sienna-chandelier',
      'lodge-fire',
      'lodge-chandelier',
    ],
  },
  oculus: {
    rooms: ['lobby', 'exhibition', 'fortress', 'salon', 'moonfall', 'lodge', 'banquet'],
    floorMirror: 'moonfall',
    // The staff stairways open onto the balcony, and the Fortress’ lantern hangs just past the north arch.
    keep: [
      'banquet-led_north',
      'banquet-led_middle',
      'banquet-led_south',
      'moonfall-wall_west_1',
      'moonfall-wall_west_2',
      'moonfall-wall_west_3',
      'moonfall-wall_west_4',
      'moonfall-wall_east_north',
      'moonfall-wall_east_south',
      'moonfall-spotlight',
      'moonfall-planet_glow',
      'moonfall-ember',
      'moonfall-stairs',
      'exhibition-tunnel_green',
      'exhibition-tunnel_blue',
      'exhibition-tunnel_red',
      'exhibition-west_stairway_door',
      'exhibition-west_stairway_upper_corner',
      'exhibition-west_stairway_ramp_1',
      'exhibition-west_stairway_ramp_2',
      'exhibition-west_stairway_ramp_3',
      'exhibition-west_stairway_lower_corner',
      'exhibition-west_stairway_landing',
      'exhibition-east_stairway_door',
      'exhibition-east_stairway_upper_corner',
      'exhibition-east_stairway_ramp_1',
      'exhibition-east_stairway_ramp_2',
      'exhibition-east_stairway_ramp_3',
      'exhibition-east_stairway_lower_corner',
      'exhibition-east_stairway_landing',
      'fortress-pendant',
    ],
  },
  exhibition: {
    rooms: ['oculus', 'moonfall', 'lobby', 'fortress', 'salon'],
    floorMirror: 'moonfall',
    // The tunnel sees what the Oculus sees, so it keeps the lamps the Oculus keeps beyond its own.
    keep: [
      'banquet-led_north',
      'banquet-led_middle',
      'banquet-led_south',
      'moonfall-wall_west_1',
      'moonfall-wall_west_2',
      'moonfall-wall_west_3',
      'moonfall-wall_west_4',
      'moonfall-wall_east_north',
      'moonfall-wall_east_south',
      'moonfall-spotlight',
      'moonfall-planet_glow',
      'moonfall-ember',
      'moonfall-stairs',
      'fortress-pendant',
    ],
  },
  lodge: {
    rooms: ['fortress', 'corridor', 'oculus'],
    keep: [
      'corridor-lantern_north',
      'corridor-lantern_middle',
      'corridor-lantern_south',
      'fortress-pendant',
    ],
  },
  fortress: {
    rooms: ['oculus', 'lodge', 'lobby', 'exhibition', 'corridor', 'salon'],
    // The passage looks into the Lodge and on into the Corridor, so it keeps the Lodge’s lamps and the ones the Lodge keeps.
    keep: [
      'corridor-lantern_north',
      'corridor-lantern_middle',
      'corridor-lantern_south',
      'lodge-fire',
      'lodge-chandelier',
    ],
  },
} satisfies Record<RoomId, RoomRelations>
/** The floor mirror to render while the player is in the room, none for a room without one or an id the gallery doesn’t know. */
export function floorMirror(room: string): FloorMirror | undefined {
  return Object.hasOwn(relations, room) ? (relations[room as RoomId] as RoomRelations).floorMirror : undefined
}

/** The rooms a lamp of the room stays on in, by its global id: its own room and every room whose {@link RoomRelations.keep} lists it. */
export function litRooms(room: RoomId, lamp: string): ReadonlyArray<RoomId> {
  return [room, ...Object.entries(relations).filter(([id, {keep}]) => id !== room && keep.includes(lamp)).map(([id]) => id as RoomId)]
}

export default relations
