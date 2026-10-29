import Branch from 'branch-component'
import {knotBays} from 'knot-materials/exhibition.ts'

import KnotStudyMap from '#component/KnotStudyMap'

export default function KnottinghamMinimap({lower}: {lower: boolean}) {
  return <Branch if={lower} else={<KnotStudyMap compact />}><div><p>Knottingham · single level</p>{knotBays.map(bay => <p key={bay.candidate.id}>{bay.labels} · {bay.candidate.title}</p>)}</div></Branch>
}
