import {lazy, Suspense} from 'react'

import {useGallery} from '#src/lib/gallery.ts'

// Loaded with the first remains, by which time the orb that left them has long brought it along.
const Orb = lazy(() => import('#component/Orb'))

/** What fusions leave of the props they use up, like the clear glass of a themed orb, in whichever world is loaded: each enters the world held by its portal, which spits it out after the result. */
export default function FusionRemains() {
  const remains = useGallery(s => s.remains)
  return remains.map(({id, orb, position}) => <Suspense key={id}><Orb id={id} orb={orb} position={position} withheld /></Suspense>)
}
