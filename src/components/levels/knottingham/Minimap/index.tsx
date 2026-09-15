import KnotStudyMap from '#component/levels/knottingham/KnotStudyMap'
import {knotBays} from '#src/lib/knots/exhibition.ts'

export default function KnotGalleryMinimap({lower}: {lower: boolean}) {
  return lower ? <div><p>Knottingham · single level</p>{knotBays.map(bay => <p key={bay.candidate.id}>{bay.labels} · {bay.candidate.title}</p>)}</div> : <KnotStudyMap compact />
}
