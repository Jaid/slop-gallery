import {knotBays, knotExhibition, knotRowHalfWidth} from 'knot-materials/exhibition.ts'

import KnotStudyMap from '#component/levels/knottingham/KnotStudyMap'
import {galleryEvents, notify, openPanel, useGallery} from '#src/lib/gallery.ts'

export default function KnotGalleryMap({css}: {css: Record<string, string>}) {
  const ready = useGallery(s => s.ready)
  return <>
    <p className={css.intro}>{knotExhibition.length} floating Knots · {knotBays.length} candidate rows. Select a candidate to visit its display. </p>
    <KnotStudyMap />
    <div className={css.rooms}>{knotBays.map(bay => <button
      disabled={!ready} key={bay.candidate.id} onClick={() => {
        openPanel(null)
        galleryEvents.dispatchEvent(new CustomEvent('teleport', {
          detail: {
            position: [-knotRowHalfWidth, 0.04, bay.center[2] + 2.5],
            rotation: [0, 0, 0, 1],
            feet: true,
          },
        }))
        notify(bay.candidate.title)
      }}
    ><strong>{bay.candidate.title}</strong><small>{bay.labels}</small></button>)}</div>
  </>
}
