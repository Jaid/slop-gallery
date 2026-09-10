import Icon from '#component/Icon'
import {rooms} from '#src/lib/gallery.ts'

import css from './style.module.sass'

export default function CollectionFilters({query, room, setQuery, setRoom}: {query: string
  room: string
  setQuery: (query: string) => void
  setRoom: (room: string) => void}) {
  return <div className={css.container}><label className={css.search}><Icon name="search" size={17}/><input type="search" placeholder="Find a work or an artist…" aria-label="Search collection" value={query} onChange={event => setQuery(event.target.value)}/></label><select aria-label="Filter by room" value={room} onChange={event => setRoom(event.target.value)}><option value="all">All rooms</option>{rooms.map(room => <option key={room.id} value={room.id}>{room.title}</option>)}<option value="loose">Waiting to be hung</option></select></div>
}
