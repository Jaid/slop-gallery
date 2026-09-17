import {knotBays} from 'knot-materials/exhibition.ts'

import KnotStudyMap from '#component/levels/knottingham/KnotStudyMap'

export default function KnotGalleryMinimap({lower}: {lower: boolean}) {
  return lower ? <div><p>Knottingham · single level</p>{knotBays.map(bay => <p key={bay.candidate.id}>{bay.labels} · {bay.candidate.title}</p>)}</div> : <KnotStudyMap compact />
}
