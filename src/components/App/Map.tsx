import {galleryBounds, galleryEvents, notify, openPanel, rooms, roomVisit, useGallery} from '#src/lib/gallery.ts'

const scale = 10
const padding = 20
const x = (value: number) => padding + (value - galleryBounds.minX) * scale
const y = (value: number) => padding + (value - galleryBounds.minZ) * scale
const width = (galleryBounds.maxX - galleryBounds.minX) * scale + padding * 2
const height = (galleryBounds.maxZ - galleryBounds.minZ) * scale + padding * 2

export default function Map() {
  const current = useGallery(s => s.room)
  const visit = (room: (typeof rooms)[number]) => {
    openPanel(null)
    galleryEvents.dispatchEvent(new CustomEvent('teleport', {detail: roomVisit(room)}))
    notify(`Welcome to ${room.title}.`)
  }
  return <>
    <p className="panel-intro">Five rooms, one questionable institution. Walk through the arches, or choose a room below.</p>
    <div className="museum-map" aria-label="Gallery floor plan"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daydream Wing in the center, Cabinet of Curiosities to the west, Afterhours Salon to the east, Good Taste Department to the south and Amber Room south of the Cabinet">
      {rooms.map(room => <g key={room.id}><rect x={x(room.center[0] - room.size[0] / 2)} y={y(room.center[1] - room.size[1] / 2)} width={room.size[0] * scale - 4} height={room.size[1] * scale - 4} rx="2" fill={room.id === current ? '#c9d4b6' : room.id === 'amber' ? '#dbc6a9' : '#e4e3d7'} stroke="#a8b196" strokeWidth="1.5"/><text x={x(room.center[0]) - 2} y={y(room.center[1])} textAnchor="middle" fill="#58684b" fontFamily="Georgia" fontSize="23">{room.number}</text>{room.id === current && <circle cx={x(room.center[0]) - 2} cy={y(room.center[1]) + 20} r="3" fill="#596e42"/>}</g>)}
    </svg></div>
    <div className="room-list">{rooms.map(room => <button key={room.id} onClick={() => visit(room)}><span>{room.number}</span><div><strong>{room.title}</strong><small>{room.subtitle}</small></div><em>{room.id === current ? 'YOU ARE HERE' : '↗'}</em></button>)}</div>
  </>
}
