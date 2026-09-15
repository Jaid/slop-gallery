import Branch from 'branch-component'
import {useEffect, useRef} from 'react'

import {cameraPose} from '#src/lib/gallery.ts'
import {knotGalleryBounds, knotGallerySize} from '#src/lib/gallery/knotGallery.ts'
import {minimapHeading} from '#src/lib/gallery/minimap.ts'
import {knotBays, knotExhibition, knotLayout} from '#src/lib/knots/exhibition.ts'

import css from './style.module.sass'

export default function KnotStudyMap({compact}: {compact?: boolean} = {}) {
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
  return <svg aria-label={`Knottingham: ${knotBays.length} candidate rows in the exhibition hall`} className={css.container} role='img' viewBox={`${knotGalleryBounds.minX - 1} ${knotGalleryBounds.northZ - 1} ${knotGallerySize[0] + 2} ${knotGallerySize[2] + 2}`}>
    <rect fill='none' height={knotGallerySize[2]} stroke='#888' strokeWidth='0.2' width={knotGallerySize[0]} x={knotGalleryBounds.minX} y={knotGalleryBounds.northZ} />
    {knotBays.map(bay => <path d={`M ${knotLayout.previewX} ${bay.center[2] - 2.4} v 4.8`} key={bay.candidate.id} stroke='#b7a885' strokeWidth='0.25'><title>{`${bay.candidate.title} overview`}</title></path>)}
    <Branch not={compact}>{knotBays.map(bay => <text className={css.label} fontSize='1.3' fontWeight='600' key={bay.candidate.id} textAnchor='middle' x={knotLayout.rowCenterX(bay.finishes.length)} y={bay.center[2] - 1.5}>{bay.candidate.title}</text>)}</Branch>
    {knotExhibition.map(exhibit => <g key={exhibit.id}>
      <title>{`${exhibit.label} · ${exhibit.title} · ${exhibit.modelTitle}`}</title>
      <circle className={css.item} cx={exhibit.position[0]} cy={exhibit.position[2]} data-knot={exhibit.id} r='0.6' />
      <Branch not={compact}><text className={css.label} fontSize='0.75' textAnchor='middle' x={exhibit.position[0]} y={exhibit.position[2] + 1.4}>{exhibit.label}</text></Branch>
    </g>)}
    <path aria-label='Your position' className={css.player} d='M 0 -2.4 L 1.35 1.5 L 0 0.85 L -1.35 1.5 Z' ref={player} transform={`translate(${cameraPose.position[0]} ${cameraPose.position[2]}) rotate(${minimapHeading(cameraPose.direction)})`} />
  </svg>
}
