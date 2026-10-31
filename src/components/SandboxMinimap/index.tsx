import type {Vec3} from '#src/lib/gallery/types.ts'

import Branch from 'branch-component'
import {useEffect, useRef} from 'react'

import {cameraPose} from '#src/lib/gallery.ts'
import sandbox from '#src/worlds/sandbox/index.ts'

import css from './style.module.sass'

const cell = sandbox.room('cell')
const [x, z] = cell.center
const [frameX, frameZ, frameWidth, frameDepth] = cell.map!.placedFrame(cell.center)
const margin = 1
const viewBox = [frameX - margin, frameZ - margin, frameWidth + margin * 2, frameDepth + margin * 2].join(' ')
const playerTransform = ([playerX, , playerZ]: Vec3, [directionX, , directionZ]: Vec3) => `translate(${playerX} ${playerZ}) rotate(${Math.atan2(directionX, -directionZ) * 180 / Math.PI})`

/** The Cell’s floor plan with the player on it, on the map’s upper side only, as the Sandbox has a single floor. */
export default function SandboxMinimap({lower}: {lower: boolean}) {
  return <Branch not={lower} then={CellMap} />
}

function CellMap() {
  const player = useRef<SVGPathElement>(null)
  useEffect(() => {
    // Read the live camera without rerendering the menu every frame.
    let frame: number
    const update = () => {
      player.current?.setAttribute('transform', playerTransform(cameraPose.position, cameraPose.direction))
      frame = requestAnimationFrame(update)
    }
    update()
    return () => cancelAnimationFrame(frame)
  }, [])
  return <svg className={css.container} aria-label={`${sandbox.title} map`} role='img' viewBox={viewBox}>
    <g dangerouslySetInnerHTML={{__html: cell.map!.markup}} data-room={cell.id} opacity={sandbox.mapOpacity(cell, cell.id)} transform={`translate(${x} ${z})`} />
    <path className={css.player} aria-label='Your position' d='M 0 -0.8 L 0.45 0.5 L 0 0.28 L -0.45 0.5 Z' transform={playerTransform(cameraPose.position, cameraPose.direction)} ref={player} />
  </svg>
}
