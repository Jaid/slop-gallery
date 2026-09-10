import {useEffect, useRef} from 'react'

import {cameraPose, useGallery} from '#src/lib/gallery.ts'
import {isLowerRoom, minimapHeading, minimapPortrait, minimapViewBox, minimapWalls} from '#src/lib/gallery/minimap.ts'

import css from './style.module.sass'

export default function MinimapLevel({lower}: {lower: boolean}) {
  const portraits = useGallery(s => s.portraits)
  const current = useGallery(s => s.room)
  const player = useRef<SVGPathElement>(null)
  const dots = useRef(new Map<string, SVGCircleElement>)
  useEffect(() => {
    // Read the live camera and rigid bodies without rerendering the menu every frame.
    const attribute = (element: SVGElement, name: string, value: string) => {
      if (element.getAttribute(name) !== value) {
        element.setAttribute(name, value)
      }
    }
    let frame: number
    const update = () => {
      if (player.current) {
        attribute(player.current, 'transform', `translate(${cameraPose.position[0]} ${cameraPose.position[2]}) rotate(${minimapHeading(cameraPose.direction)})`)
        attribute(player.current, 'display', isLowerRoom(useGallery.getState().room) === lower ? 'inline' : 'none')
      }
      for (const portrait of portraits) {
        const dot = dots.current.get(portrait.id)
        if (!dot) {
          continue
        }
        const marker = minimapPortrait(portrait)
        attribute(dot, 'cx', String(marker.position[0]))
        attribute(dot, 'cy', String(marker.position[2]))
        attribute(dot, 'display', !portrait.reserved && marker.lower === lower ? 'inline' : 'none')
      }
      frame = requestAnimationFrame(update)
    }
    update()
    return () => cancelAnimationFrame(frame)
  }, [lower, portraits])
  return <svg className={css.container} viewBox={minimapViewBox} role="img" aria-label={lower ? 'Lower gallery minimap' : 'Upper gallery minimap'}>
    <g className={css.walls}>{minimapWalls.filter(wall => wall.lower === lower).map((wall, i) => <polyline key={i} points={wall.path}/>)}</g>
    <g className={css.portraits}>{portraits.map(portrait => {
      const marker = minimapPortrait(portrait)
      return <circle key={portrait.id} ref={element => {
        if (element) {
          dots.current.set(portrait.id, element)
        } else {
          dots.current.delete(portrait.id)
        }
      }} data-portrait={portrait.id} cx={marker.position[0]} cy={marker.position[2]} r="0.6" display={!portrait.reserved && marker.lower === lower ? 'inline' : 'none'}/>
    })}</g>
    <path ref={player} className={css.player} aria-label="Your position" d="M 0 -2.4 L 1.35 1.5 L 0 0.85 L -1.35 1.5 Z" transform={`translate(${cameraPose.position[0]} ${cameraPose.position[2]}) rotate(${minimapHeading(cameraPose.direction)})`} display={isLowerRoom(current) === lower ? 'inline' : 'none'}/>
  </svg>
}
