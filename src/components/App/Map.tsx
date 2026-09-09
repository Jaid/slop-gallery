import type {RoomId} from '#src/lib/gallery.ts'

import {galleryEvents, notify, openPanel, rooms, roomVisit, useGallery} from '#src/lib/gallery.ts'
import {daydream} from '#src/lib/gallery/daydream.ts'
import {glasswellBalcony} from '#src/lib/gallery/glasswellBalcony.ts'
import {glasswellTower, towerRampHalfWidth, towerRampSections} from '#src/lib/gallery/glasswellTower.ts'
import {glasswellPlatform, glasswellRamps, lowerGallery} from '#src/lib/gallery/lowerGallery.ts'
import {stairBlocks, staircase, stairTurn} from '#src/lib/gallery/staircase.ts'
import {tunnelDisplays} from '#src/lib/gallery/tunnelDisplays.ts'

const roomColors: Partial<Record<RoomId, string>> = {
  undertone: '#b7cdcd',
  amber: '#dbc6a9',
  glasswell: '#adced0',
}
const scale = 10
const padding = 20
const levels = [false, true].map(lower => {
  const levelRooms = rooms.filter(room => room.floorY < 0 === lower)
  const bounds = {
    minX: Math.min(...levelRooms.map(room => room.center[0] - room.size[0] / 2), staircase.startX),
    maxX: Math.max(...levelRooms.map(room => room.center[0] + room.size[0] / 2), staircase.turnX + staircase.width),
    minZ: Math.min(...levelRooms.map(room => room.center[1] - room.size[1] / 2)),
    maxZ: Math.max(...levelRooms.map(room => room.center[1] + room.size[1] / 2), staircase.returnZ + staircase.width / 2),
  }
  return {
    lower,
    rooms: levelRooms,
    width: (bounds.maxX - bounds.minX) * scale + padding * 2,
    height: (bounds.maxZ - bounds.minZ) * scale + padding * 2,
    x: (value: number) => padding + (value - bounds.minX) * scale,
    y: (value: number) => padding + (value - bounds.minZ) * scale,
  }
})

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
    <p className="panel-intro">Seven rooms on two levels. The Antechamber’s U-turn stairs lead to the Undertone below it. Follow the tunnel north to the Glasswell, lit from the gallery above.</p>
    {levels.map(level => <div key={String(level.lower)} className="museum-map">
      <h3>{level.lower ? 'Lower level' : 'Upper level'}</h3>
      <svg viewBox={`0 0 ${level.width} ${level.height}`} role="img" aria-label={level.lower ? 'Undertone below the Antechamber, connected north by tunnel to the Glasswell beneath the glass floor' : 'Upper gallery and U-turn stairs from the Antechamber'}>
        <g aria-label="U-turn stairs">
          {stairBlocks.map((block, i) => <rect key={i} x={level.x(block.position[0] - block.size[0] / 2)} y={level.y(block.position[2] - block.size[2] / 2)} width={block.size[0] * scale} height={block.size[2] * scale} fill="#c3ccc4" stroke="#71857e" strokeWidth="0.5"/>)}
          <path d={`M ${level.x(staircase.startX + 1)} ${level.y(staircase.z)} H ${level.x(stairTurn.position[0])} V ${level.y(staircase.returnZ)} H ${level.x(staircase.endX)}`} fill="none" stroke="#526e65" strokeWidth="2"/>
        </g>
        {level.lower && <rect aria-label="Connecting tunnel" x={level.x(-lowerGallery.tunnel.width / 2)} y={level.y(lowerGallery.tunnel.northZ)} width={lowerGallery.tunnel.width * scale} height={(lowerGallery.tunnel.southZ - lowerGallery.tunnel.northZ) * scale} fill="#c3ccc4" stroke="#71857e"/>}
        {level.lower && tunnelDisplays.map(display => <g key={display.side} aria-label={`${display.side} display room, visible through glass but inaccessible`}>
          <rect x={level.x(display.center[0] - display.size[0] / 2)} y={level.y(display.center[1] - display.size[1] / 2)} width={display.size[0] * scale} height={display.size[1] * scale} fill="#657276" stroke="#46575b"/>
          <path d={`M ${level.x(display.frontX)} ${level.y(display.center[1] - display.size[1] / 2)} V ${level.y(display.center[1] + display.size[1] / 2)}`} stroke="#a9e0e4" strokeWidth="2"/>
          {display.exhibits.map(exhibit => <circle key={exhibit.id} cx={level.x(exhibit.position[0])} cy={level.y(exhibit.position[2])} r="4" fill="#d3c7a4"/>)}
        </g>)}
        {level.rooms.map(room => <g key={room.id}>
          <rect x={level.x(room.center[0] - room.size[0] / 2)} y={level.y(room.center[1] - room.size[1] / 2)} width={room.size[0] * scale - 4} height={room.size[1] * scale - 4} rx="2" fill={room.id === current ? '#c9d4b6' : roomColors[room.id] ?? '#e4e3d7'} stroke="#a8b196" strokeWidth="1.5"/>
          <text x={level.x(room.center[0]) - 2} y={level.y(room.id === 'daydream' ? 0 : room.center[1])} textAnchor="middle" fill="#58684b" fontFamily="Georgia" fontSize="23">{room.number}</text>
          {room.id === current && <circle cx={level.x(room.center[0]) - 2} cy={level.y(room.id === 'daydream' ? 0 : room.center[1]) + 20} r="3" fill="#596e42"/>}
        </g>)}
        {level.lower && <g aria-label="Raised ground in the Glasswell">
          <path aria-label="Tower access ramp" d={`M ${[-1, 1].flatMap(side => (side === -1 ? towerRampSections : towerRampSections.toReversed()).map(z => `${level.x(glasswellTower.x + side * towerRampHalfWidth(z))} ${level.y(z)}`)).join(' L ')} Z`} fill="#657276" stroke="#46575b"/>
          <path aria-label="Separate wall balcony" d={`M ${level.x(glasswellBalcony.x - glasswellBalcony.width / 2)} ${level.y(glasswellBalcony.z)} A ${glasswellBalcony.width / 2 * scale} ${glasswellBalcony.depth * scale} 0 0 1 ${level.x(glasswellBalcony.x + glasswellBalcony.width / 2)} ${level.y(glasswellBalcony.z)} Z`} fill="#718c8e" stroke="#46575b"/>
          <circle aria-label="Cylindrical platform" cx={level.x(glasswellTower.x)} cy={level.y(glasswellTower.z)} r={glasswellTower.radius * scale} fill="#718c8e" stroke="#46575b"/>
          {glasswellRamps.map(ramp => <rect key={ramp.side} aria-label={`${ramp.side} access ramp`} x={level.x(ramp.x - ramp.width / 2)} y={level.y(ramp.startZ - ramp.run)} width={ramp.width * scale} height={ramp.run * scale} fill="#657276" stroke="#46575b"/>)}
          <rect x={level.x(glasswellPlatform.position[0] - glasswellPlatform.size[0] / 2)} y={level.y(glasswellPlatform.position[2] - glasswellPlatform.size[2] / 2)} width={glasswellPlatform.size[0] * scale - 4} height={glasswellPlatform.size[2] * scale} fill="#718c8e"/>
          <text x={level.x(glasswellPlatform.position[0]) - 2} y={level.y(glasswellPlatform.position[2])} textAnchor="middle" fill="#f0f0e5" fontSize="10">RAISED FLOOR</text>
        </g>}
        {!level.lower && <g aria-label="Glass floor above the Glasswell">
          <rect x={level.x(daydream.opening.center[0] - daydream.opening.size[0] / 2)} y={level.y(daydream.opening.center[1] - daydream.opening.size[1] / 2)} width={daydream.opening.size[0] * scale} height={daydream.opening.size[1] * scale} fill="#adced0" stroke="#6b969e"/>
          <text x={level.x(daydream.opening.center[0])} y={level.y(daydream.opening.center[1])} textAnchor="middle" fill="#355c63" fontSize="11">GLASS FLOOR</text>
        </g>}
      </svg>
    </div>)}
    <div className="room-list">{rooms.map(room => <button key={room.id} disabled={!ready} onClick={() => visit(room)}><span>{room.number}</span><div><strong>{room.title}</strong><small>{room.subtitle}</small></div><em>{room.id === current ? 'YOU ARE HERE' : '↗'}</em></button>)}</div>
  </>
}
