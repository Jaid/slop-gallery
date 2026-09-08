import {galleryEvents, notify, openPanel, rooms, useGallery} from '#src/lib/gallery.ts'

export default function Map() {
  const current = useGallery(s => s.room)
  const secretOpen = useGallery(s => s.secretOpen)
  const visit = (room: (typeof rooms)[number]) => {
    openPanel(null)
    galleryEvents.dispatchEvent(new CustomEvent('teleport', {
      detail: {
        position: [room.center[0], 1.7, room.id === 'secret' ? 10.4 : 5.6],
        rotation: room.id === 'secret' ? [0, 1, 0, 0] : [0, 0, 0, 1],
      },
    }))
    notify(`Welcome to ${room.title}.`)
  }
  return <>
    <p className="panel-intro">Three rooms, one questionable institution. Walk through the arches, or choose a room below.</p>
    <div className="museum-map" aria-label="Gallery floor plan"><svg viewBox="0 0 440 270" role="img" aria-label="Daydream Wing in the center, Cabinet of Curiosities to the west, Afterhours Salon to the east and a secret room to the south">
      {rooms.map(room => <g key={room.id} opacity={room.id === 'secret' && !secretOpen ? 0.3 : 1}><rect x={220 + room.center[0] * 10 - room.size[0] * 5} y={85 + room.center[1] * 10 - room.size[1] * 5} width={room.size[0] * 10 - 4} height={room.size[1] * 10 - 4} rx="2" fill={room.id === current ? '#c9d4b6' : '#e4e3d7'} stroke="#a8b196" strokeWidth="1.5"/><text x={218 + room.center[0] * 10} y={85 + room.center[1] * 10} textAnchor="middle" fill="#58684b" fontFamily="Georgia" fontSize="23">{room.id === 'secret' && !secretOpen ? '?' : room.number}</text>{room.id === current && <circle cx={218 + room.center[0] * 10} cy={105 + room.center[1] * 10} r="3" fill="#596e42"/>}</g>)}
    </svg></div>
    <div className="room-list">{rooms.map(room => <button key={room.id} disabled={room.id === 'secret' && !secretOpen} onClick={() => visit(room)}><span>{room.number}</span><div><strong>{room.id === 'secret' && !secretOpen ? 'A room yet to be found' : room.title}</strong><small>{room.id === 'secret' && !secretOpen ? 'A little reading might open a door.' : room.subtitle}</small></div><em>{room.id === current ? 'YOU ARE HERE' : (room.id === 'secret' && !secretOpen ? 'LOCKED' : '↗')}</em></button>)}</div>
  </>
}
