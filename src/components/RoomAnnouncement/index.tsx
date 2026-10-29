import {useState} from 'react'

import {useGallery} from '#src/lib/gallery.ts'
import {rooms} from '#src/lib/gallery/walls.ts'

import css from './style.module.sass'

const roomTitle = (id: string) => rooms.find(room => room.id === id)?.title ?? id

/** The title of the room the player just walked into, shrinking into place at the top center and fading out again. The room the HUD mounts in is not announced. */
export default function RoomAnnouncement() {
  const room = useGallery(s => s.room)
  const [seen, setSeen] = useState(room)
  const [announcement, setAnnouncement] = useState<{
    count: number
    room: string
  } | null>(null)
  if (room !== seen) {
    setSeen(room)
    setAnnouncement({
      room,
      count: (announcement?.count ?? 0) + 1,
    })
  }
  if (!announcement) {
    return null
  }
  // Keyed by count so that every room change restarts the animation, even back into the room still fading out.
  return <div key={announcement.count} className={css.container} data-testid='room-announcement' role='status'>
    {roomTitle(announcement.room)}
  </div>
}
