import KnotExhibition from '#component/KnotExhibition'
import Lobby from '#component/KnotLobby'
import KnotSpectation from '#component/KnotSpectation'
import {useGallery} from '#src/lib/gallery.ts'

/** Knottingham’s one room: its hall and lighting, the Knots’ announcements and the exhibition, which a reset builds anew. */
export default function ArenaRoom() {
  const resetEpoch = useGallery(s => s.resetEpoch)
  return <>
    <Lobby />
    <KnotSpectation />
    <KnotExhibition key={resetEpoch} />
  </>
}
