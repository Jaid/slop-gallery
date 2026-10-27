import optis from 'optis'
import readPermalink from 'read-permalink'

/** how RoomCulling decides which other rooms to draw: through the openings on screen, or the rooms `relations.ts` lists for the camera’s room whose fences meet the view */
export type RoomCullingMode = 'portals' | 'relations'

const modes = new Set<unknown>(['portals', 'relations'])
const schema = optis({
  defaults: {
    room_culling: 'portals',
  },
  normalizations: {
    room_culling(value: unknown): RoomCullingMode {
      return modes.has(value) ? value as RoomCullingMode : 'portals'
    },
  },
})

/** Read `?room_culling`, `portals` by default. */
export function readRoomCulling(input: URL | string = typeof location === 'undefined' ? '' : location.href): RoomCullingMode {
  return readPermalink(input, {schema}).room_culling
}
