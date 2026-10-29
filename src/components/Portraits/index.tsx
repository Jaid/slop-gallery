import Portrait from '#component/Portrait'
import {useGallery} from '#src/lib/gallery.ts'

/** Every artwork of the collection, hung or loose, in whichever world is loaded. */
export default function Portraits() {
  const portraits = useGallery(s => s.portraits)
  return portraits.map(p => <Portrait key={p.id} portrait={p} />)
}
