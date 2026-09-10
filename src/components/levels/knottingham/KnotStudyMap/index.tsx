import {useEffect, useRef} from 'react'

import {cameraPose} from '#src/lib/gallery.ts'
import {knotBays, knotExhibition} from '#src/lib/knots/exhibition.ts'
import {knotGalleryBounds, knotGallerySize} from '#src/lib/gallery/knotGallery.ts'
import {minimapHeading} from '#src/lib/gallery/minimap.ts'

import css from './style.module.sass'

export default function KnotStudyMap() {
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
    <rect x={knotGalleryBounds.minX} y={knotGalleryBounds.northZ} width={knotGallerySize[0]} height={knotGallerySize[2]} fill="#e4e3d7" stroke="#6d7464" strokeWidth="0.25"/>
    {knotBays.map(bay => <text key={bay.model} x={bay.center[0]} y={bay.center[2] - 1.5} textAnchor="middle" fill="#233a43" fontSize="1.3" fontWeight="600">{bay.title}</text>)}
    {knotExhibition.map(exhibit => <g key={exhibit.id}>
      <title>{exhibit.label} · {exhibit.title} · {exhibit.modelTitle}</title>
      <circle cx={exhibit.position[0]} cy={exhibit.position[2]} r="0.5" fill="#327ec4"/>
      <text x={exhibit.position[0]} y={exhibit.position[2] + 1.4} textAnchor="middle" fill="#233a43" fontSize="0.75">{exhibit.label}</text>
    </g>)}
    <path ref={player} fill="#cf342e" aria-label="Your position" d="M 0 -1.3 L 0.65 0.7 L 0 0.4 L -0.65 0.7 Z"/>
  </svg>
}
