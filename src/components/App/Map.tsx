import {galleryBounds, galleryEvents, notify, openPanel, rooms, roomVisit, useGallery} from '#src/lib/gallery.ts'
import {staircase} from '#src/lib/gallery/staircase.ts'

const roomColors: Record<string, string> = {
  undertone: '#b7cdcd',
  amber: '#dbc6a9',
}
const scale = 10
const padding = 20
const x = (value: number) => padding + (value - galleryBounds.minX) * scale
const y = (value: number) => padding + (value - galleryBounds.minZ) * scale
const width = (galleryBounds.maxX - galleryBounds.minX) * scale + padding * 2
const height = (galleryBounds.maxZ - galleryBounds.minZ) * scale + padding * 2

export default function Map() {
  const ready = useGallery(s => s.ready)
  const current = useGallery(s => s.room)
  const visit = (room: (typeof rooms)[number]) => {
    if (!ready) {
      return
    }
    openPanel(null)
    galleryEvents.dispatchEvent(new CustomEvent('teleport', {detail: roomVisit(room)}))
    notify(`Welcome to ${room.title}.`)
  }
  return <>
    <p className="panel-intro">Six rooms, two levels, one questionable institution. Take the Antechamber’s stairs down to the Undertone, or choose a room below.</p>
    <div className="museum-map" aria-label="Gallery floor plan"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daydream Wing in the center, Cabinet of Curiosities to the west, Afterhours Salon to the east, Antechamber to the south, Amber Room south of the Cabinet and Undertone downstairs east of the Antechamber">
      <g aria-label="Stairs down from the Antechamber to the Undertone">
        <rect x={x(staircase.startX)} y={y(staircase.z - staircase.width / 2)} width={(staircase.endX - staircase.startX) * scale} height={staircase.width * scale - 4} fill="#c3ccc4"/>
        {Array.from({length: 8}, (_, i) => <path key={i} d={`M ${x(staircase.startX + i + 0.5)} ${y(staircase.z - 0.9)} v 14`} stroke="#71857e"/>)}
      </g>
      {rooms.map(room => <g key={room.id}><rect x={x(room.center[0] - room.size[0] / 2)} y={y(room.center[1] - room.size[1] / 2)} width={room.size[0] * scale - 4} height={room.size[1] * scale - 4} rx="2" fill={room.id === current ? '#c9d4b6' : roomColors[room.id] ?? '#e4e3d7'} stroke="#a8b196" strokeWidth="1.5"/><text x={x(room.center[0]) - 2} y={y(room.center[1])} textAnchor="middle" fill="#58684b" fontFamily="Georgia" fontSize="23">{room.number}</text>{room.floorY < 0 && <text x={x(room.center[0]) - 2} y={y(room.center[1]) + 36} textAnchor="middle" fill="#58684b" fontSize="11">LOWER LEVEL</text>}{room.id === current && <circle cx={x(room.center[0]) - 2} cy={y(room.center[1]) + 20} r="3" fill="#596e42"/>}</g>)}
    </svg></div>
    <div className="room-list">{rooms.map(room => <button key={room.id} disabled={!ready} onClick={() => visit(room)}><span>{room.number}</span><div><strong>{room.title}</strong><small>{room.subtitle}</small></div><em>{room.id === current ? 'YOU ARE HERE' : '↗'}</em></button>)}</div>
  </>
}
