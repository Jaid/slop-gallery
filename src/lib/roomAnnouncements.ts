import optis from 'optis'
import readPermalink, {parseBoolean} from 'read-permalink'

const roomAnnouncementsSchema = optis({
  defaults: {
    room_announcements: true,
  },
  normalizations: {
    room_announcements(value: unknown) {
      try {
        return parseBoolean(value)
      } catch {
        return true
      }
    },
  },
})

/** Read the `?room_announcements` flag; only an explicit `false` or `0` stops showing the room title on entering another room. */
export function readRoomAnnouncements(input: URL | string = typeof location === 'undefined' ? '' : location.href): boolean {
  return readPermalink(input, {schema: roomAnnouncementsSchema}).room_announcements
}

/** whether entering another room shows its title, read once at startup */
export const isAnnouncingRooms = readRoomAnnouncements()
