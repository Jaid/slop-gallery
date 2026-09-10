import KnotStudyMap from '#component/levels/knottingham/KnotStudyMap'
import {galleryEvents, notify, openPanel, useGallery} from '#src/lib/gallery.ts'
import {knotBays, knotExhibition, knotRowHalfWidth} from '#src/lib/knots/exhibition.ts'

export default function KnotGalleryMap({css}: {css: Record<string, string>}) {
  const ready = useGallery(s => s.ready)
  return <>
    <p className={css.intro}>{knotExhibition.length} floating Knots · {knotBays.length} model rows. Select a model to visit its display. </p>
    <KnotStudyMap/>
    <div className={css.rooms}>{knotBays.map(bay => <button key={bay.model} disabled={!ready} onClick={() => {
      openPanel(null)
      galleryEvents.dispatchEvent(new CustomEvent('teleport', {
        detail: {
          position: [-knotRowHalfWidth, 0.04, bay.center[2] + 2.5],
          rotation: [0, 0, 0, 1],
          feet: true,
        },
      }))
      notify(bay.title)
    }}><strong>{bay.title}</strong><small>{bay.labels}</small></button>)}</div>
  </>
}
