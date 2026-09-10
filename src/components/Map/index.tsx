import type {RoomId} from '#src/lib/gallery.ts'

import {galleryEvents, notify, openPanel, rooms, roomVisit, useGallery} from '#src/lib/gallery.ts'
import {corridorPassage, corridorStairs} from '#src/lib/gallery/corridor.ts'
import {fountainBench, fountainBenches} from '#src/lib/gallery/fountain/benches.ts'
import {fountain} from '#src/lib/gallery/fountain/config.ts'
import {lobby} from '#src/lib/gallery/lobby.ts'
import {lodgeTunnel} from '#src/lib/gallery/lodge.ts'
import {lowerGallery, oculusPlatform, oculusRamps} from '#src/lib/gallery/lowerGallery.ts'
import {moonfallCrater} from '#src/lib/gallery/moonfall/config.ts'
import {oculusBalcony} from '#src/lib/gallery/oculusBalcony.ts'
import {oculusTower, towerRampHalfWidth, towerRampSections} from '#src/lib/gallery/oculusTower.ts'
import {stairBlocks, staircase, stairTurn} from '#src/lib/gallery/staircase.ts'
import {tunnelDisplays} from '#src/lib/gallery/tunnelDisplays.ts'

import css from './style.module.sass'

const roomColors: Partial<Record<RoomId, string>> = {
  moonfall: '#b7cdcd',
  sienna: '#dbc6a9',
  oculus: '#adced0',
  lodge: '#ceae87',
}
const scale = 10
const padding = 20
const routePassages = [lodgeTunnel, corridorPassage] as const
const corridorRoom = rooms.find(room => room.id === 'corridor')!
const routeFill = (room: RoomId, current: RoomId) => {
  if (room === current) {
    return '#c9d4b6'
  }
  return room === 'corridor' ? '#b6a78e' : '#657276'
}
const levels = [false, true].map(lower => {
  const levelRooms = rooms.filter(room => room.floorY < 0 === lower)
  const bounds = {
    minX: Math.min(...levelRooms.map(room => room.center[0] - room.size[0] / 2), staircase.startX, ...routePassages.filter(passage => passage.floorY < 0 === lower).flatMap(passage => passage.floors.map(floor => floor.center[0] - floor.size[0] / 2)), ...corridorStairs.blocks.map(block => block.position[0] - block.size[0] / 2)),
    maxX: Math.max(...levelRooms.map(room => room.center[0] + room.size[0] / 2), staircase.turnX + stairTurn.outerRadius),
    minZ: Math.min(...levelRooms.map(room => room.center[1] - room.size[1] / 2)),
    maxZ: Math.max(...levelRooms.map(room => room.center[1] + room.size[1] / 2), staircase.returnZ + staircase.lowerWidth / 2),
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
    <p className={css.intro}>Nine rooms across the upper and lower galleries. The Oculus’s raised north platform leads through a stone tunnel to the Lodge. The Corridor follows the timber return route from the Lodge to Sienna.</p>
    {levels.map(level => <div key={String(level.lower)} className={css.level}>
      <h3>{level.lower ? 'Lower level' : 'Upper level'}</h3>
      <svg viewBox={`0 0 ${level.width} ${level.height}`} role="img" aria-label={level.lower ? 'Moonfall below the Antechamber, connected north by tunnel to the Oculus beneath the glass floor' : 'Upper gallery and U-turn stairs from the Antechamber'}>
        <g aria-label="Lodge access and Corridor to Sienna">
          {routePassages.filter(passage => passage.floorY < 0 === level.lower).flatMap(passage => passage.floors.map(({center, size}, i) => <rect key={passage.id + i} x={level.x(center[0] - size[0] / 2)} y={level.y(center[1] - size[1] / 2)} width={size[0] * scale} height={size[1] * scale} fill={routeFill(passage.room, current)}/>))}
          {corridorStairs.blocks.map((block, i) => <rect key={i} x={level.x(block.position[0] - block.size[0] / 2)} y={level.y(block.position[2] - block.size[2] / 2)} width={block.size[0] * scale} height={block.size[2] * scale} fill={current === 'corridor' ? '#c9d4b6' : '#784d35'} stroke="#692325" strokeWidth="0.5"/>)}
        </g>
        <g aria-label="U-turn stairs">
          {stairBlocks.map((block, i) => <rect key={i} x={level.x(block.position[0] - block.size[0] / 2)} y={level.y(block.position[2] - block.size[2] / 2)} width={block.size[0] * scale} height={block.size[2] * scale} fill="#c3ccc4" stroke="#71857e" strokeWidth="0.5"/>)}
          <path d={`M ${level.x(staircase.turnX)} ${level.y(stairTurn.outerCenterZ - stairTurn.outerRadius)} A ${stairTurn.outerRadius * scale} ${stairTurn.outerRadius * scale} 0 0 1 ${level.x(staircase.turnX)} ${level.y(stairTurn.outerCenterZ + stairTurn.outerRadius)} L ${level.x(staircase.turnX)} ${level.y(stairTurn.innerCenterZ + stairTurn.innerRadius)} A ${stairTurn.innerRadius * scale} ${stairTurn.innerRadius * scale} 0 0 0 ${level.x(staircase.turnX)} ${level.y(stairTurn.innerCenterZ - stairTurn.innerRadius)} Z`} fill="#c3ccc4" stroke="#71857e" strokeWidth="0.5"/>
          <path d={`M ${level.x(staircase.startX + 1)} ${level.y(staircase.z)} H ${level.x(staircase.turnX)} A ${stairTurn.radius * scale} ${stairTurn.radius * scale} 0 0 1 ${level.x(staircase.turnX)} ${level.y(staircase.returnZ)} H ${level.x(staircase.endX)}`} fill="none" stroke="#526e65" strokeWidth="2"/>
        </g>
        {level.lower && <rect aria-label="Connecting tunnel" x={level.x(-lowerGallery.tunnel.width / 2)} y={level.y(lowerGallery.tunnel.northZ)} width={lowerGallery.tunnel.width * scale} height={(lowerGallery.tunnel.southZ - lowerGallery.tunnel.northZ) * scale} fill="#c3ccc4" stroke="#71857e"/>}
        {level.lower && tunnelDisplays.map(display => <g key={display.side} aria-label={`${display.side} display room, visible through glass but inaccessible`}>
          <rect x={level.x(display.center[0] - display.size[0] / 2)} y={level.y(display.center[1] - display.size[1] / 2)} width={display.size[0] * scale} height={display.size[1] * scale} fill="#657276" stroke="#46575b"/>
          <path d={`M ${level.x(display.frontX)} ${level.y(display.center[1] - display.size[1] / 2)} V ${level.y(display.center[1] + display.size[1] / 2)}`} stroke="#a9e0e4" strokeWidth="2"/>
          {display.exhibits.map(exhibit => <circle key={exhibit.id} cx={level.x(exhibit.position[0])} cy={level.y(exhibit.position[2])} r="4" fill="#d3c7a4"/>)}
        </g>)}
        {level.rooms.filter(room => room.id !== 'corridor').map(room => <g key={room.id}>
          <rect x={level.x(room.center[0] - room.size[0] / 2)} y={level.y(room.center[1] - room.size[1] / 2)} width={room.size[0] * scale - 4} height={room.size[1] * scale - 4} rx="2" fill={room.id === current ? '#c9d4b6' : roomColors[room.id] ?? '#e4e3d7'} stroke="#a8b196" strokeWidth="1.5"/>
          {room.id === 'moonfall' && <g aria-label="Moonfall impact crater and circular safety barrier">
            <circle cx={level.x(lowerGallery.moonfall.center[0])} cy={level.y(lowerGallery.moonfall.center[1])} r={moonfallCrater.radius * scale} fill="#6b665c" fillOpacity={0.55} stroke="#82796a" strokeWidth="3"/>
            <circle cx={level.x(lowerGallery.moonfall.center[0])} cy={level.y(lowerGallery.moonfall.center[1])} r={moonfallCrater.fenceRadius * scale} fill="none" stroke="#9d815c" strokeDasharray="4 3"/>
          </g>}
          <text x={level.x(room.center[0]) - 2} y={level.y(room.id === 'lobby' ? 0 : room.center[1])} textAnchor="middle" fill="#58684b" fontFamily="Georgia" fontSize="23">{room.number}</text>
          {room.id === current && <circle cx={level.x(room.center[0]) - 2} cy={level.y(room.id === 'lobby' ? 0 : room.center[1]) + 20} r="3" fill="#596e42"/>}
        </g>)}

        {level.lower && <g aria-label="Corridor">
          <text x={level.x(corridorRoom.center[0]) - 2} y={level.y(corridorRoom.center[1])} textAnchor="middle" fill="#58684b" fontFamily="Georgia" fontSize="23">{corridorRoom.number}</text>
          {current === 'corridor' && <circle cx={level.x(corridorRoom.center[0]) - 2} cy={level.y(corridorRoom.center[1]) + 20} r="3" fill="#596e42"/>}
        </g>}
        {level.lower && <g aria-label="Raised ground in the Oculus">
          <path aria-label="Tower access ramp" d={`M ${[-1, 1].flatMap(side => (side === -1 ? towerRampSections : towerRampSections.toReversed()).map(z => `${level.x(oculusTower.x + side * towerRampHalfWidth(z))} ${level.y(z)}`)).join(' L ')} Z`} fill="#657276" stroke="#46575b"/>
          <path aria-label="Separate wall balcony" d={`M ${level.x(oculusBalcony.x - oculusBalcony.width / 2)} ${level.y(oculusBalcony.z)} A ${oculusBalcony.width / 2 * scale} ${oculusBalcony.depth * scale} 0 0 1 ${level.x(oculusBalcony.x + oculusBalcony.width / 2)} ${level.y(oculusBalcony.z)} Z`} fill="#718c8e" stroke="#46575b"/>
          <circle aria-label="Cylindrical platform" cx={level.x(oculusTower.x)} cy={level.y(oculusTower.z)} r={oculusTower.radius * scale} fill="#718c8e" stroke="#46575b"/>
          {oculusRamps.map(ramp => <rect key={ramp.side} aria-label={`${ramp.side} access ramp`} x={level.x(ramp.x - ramp.width / 2)} y={level.y(ramp.startZ - ramp.run)} width={ramp.width * scale} height={ramp.run * scale} fill="#657276" stroke="#46575b"/>)}
          <rect x={level.x(oculusPlatform.position[0] - oculusPlatform.size[0] / 2)} y={level.y(oculusPlatform.position[2] - oculusPlatform.size[2] / 2)} width={oculusPlatform.size[0] * scale - 4} height={oculusPlatform.size[2] * scale} fill="#718c8e"/>
          <text x={level.x(oculusPlatform.position[0]) - 2} y={level.y(oculusPlatform.position[2])} textAnchor="middle" fill="#f0f0e5" fontSize="10">RAISED FLOOR</text>
        </g>}
        {!level.lower && <g aria-label="Glass floor above the Oculus">
          {fountainBenches.map(({position, rotation}, i) => <rect key={i} aria-label="Fountain bench" x={level.x(position[0]) - fountainBench.width * scale / 2} y={level.y(position[2]) - fountainBench.depth * scale / 2} width={fountainBench.width * scale} height={fountainBench.depth * scale} fill="#977455" transform={`rotate(${-rotation[1] * 180 / Math.PI} ${level.x(position[0])} ${level.y(position[2])})`}/>)}
          <circle aria-label="Lobby fountain" cx={level.x(fountain.position[0])} cy={level.y(fountain.position[2])} r={fountain.radius * scale} fill="#73a9a1" stroke="#b1a283" strokeWidth="2"/>
          <path aria-label="Closed main entrance" d={`M ${level.x(-1.65)} ${level.y(lobby.northZ)} H ${level.x(1.65)}`} stroke="#8d7044" strokeWidth="4"/>
          <rect x={level.x(lobby.opening.center[0] - lobby.opening.size[0] / 2)} y={level.y(lobby.opening.center[1] - lobby.opening.size[1] / 2)} width={lobby.opening.size[0] * scale} height={lobby.opening.size[1] * scale} fill="#adced0" stroke="#6b969e"/>
          <text x={level.x(lobby.opening.center[0])} y={level.y(lobby.opening.center[1])} textAnchor="middle" fill="#355c63" fontSize="11">GLASS FLOOR</text>
        </g>}
      </svg>
    </div>)}
    <div className={css.rooms}>{rooms.map(room => <button key={room.id} disabled={!ready} onClick={() => visit(room)}><span>{room.number}</span><div><strong>{room.title}</strong><small>{room.subtitle}</small></div><em>{room.id === current ? 'YOU ARE HERE' : '↗'}</em></button>)}</div>
  </>
}
