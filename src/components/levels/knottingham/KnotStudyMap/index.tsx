import {useEffect, useRef} from 'react'

import {cameraPose} from '#src/lib/gallery.ts'
import {knotGalleryBounds, knotGallerySize} from '#src/lib/gallery/knotGallery.ts'
import {minimapHeading} from '#src/lib/gallery/minimap.ts'
import {knotBays, knotExhibition, knotLayout} from '#src/lib/knots/exhibition.ts'

import css from './style.module.sass'

export default function KnotStudyMap({compact = false}: {compact?: boolean} = {}) {
  const player = useRef<SVGPathElement>(null)
  useEffect(() => {
    let frame: number
    const update = () => {
      player.current?.setAttribute('transform', `translate(${cameraPose.position[0]} ${cameraPose.position[2]}) rotate(${minimapHeading(cameraPose.direction)})`)
      frame = requestAnimationFrame(update)
    }
    update()
    return () => cancelAnimationFrame(frame)
  }, [])
  return <svg className={css.container} viewBox={`${knotGalleryBounds.minX - 1} ${knotGalleryBounds.northZ - 1} ${knotGallerySize[0] + 2} ${knotGallerySize[2] + 2}`} role="img" aria-label={`Knottingham: ${knotBays.length} model rows in the exhibition hall`}>
    <rect x={knotGalleryBounds.minX} y={knotGalleryBounds.northZ} width={knotGallerySize[0]} height={knotGallerySize[2]} fill="none" stroke="#888" strokeWidth="0.2"/>
    {knotBays.map(bay => <path key={bay.model} d={`M ${knotLayout.previewX} ${bay.center[2] - 2.4} v 4.8`} stroke="#b7a885" strokeWidth="0.25"><title>{`${bay.title} overview`}</title></path>)}
    {!compact && knotBays.map(bay => <text key={bay.model} x={knotLayout.rowCenterX(bay.finishes.length)} y={bay.center[2] - 1.5} textAnchor="middle" className={css.label} fontSize="1.3" fontWeight="600">{bay.title}</text>)}
    {knotExhibition.map(exhibit => <g key={exhibit.id}>
      <title>{`${exhibit.label} · ${exhibit.title} · ${exhibit.modelTitle}`}</title>
      <circle data-knot={exhibit.id} cx={exhibit.position[0]} cy={exhibit.position[2]} r="0.6" className={css.item}/>
      {!compact && <text x={exhibit.position[0]} y={exhibit.position[2] + 1.4} textAnchor="middle" className={css.label} fontSize="0.75">{exhibit.label}</text>}
    </g>)}
    <path ref={player} className={css.player} aria-label="Your position" d="M 0 -2.4 L 1.35 1.5 L 0 0.85 L -1.35 1.5 Z" transform={`translate(${cameraPose.position[0]} ${cameraPose.position[2]}) rotate(${minimapHeading(cameraPose.direction)})`}/>
  </svg>
}
