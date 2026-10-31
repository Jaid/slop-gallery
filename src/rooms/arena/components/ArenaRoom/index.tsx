import KnotExhibition from '#component/KnotExhibition'
import Lobby from '#component/KnotLobby'
import KnotSpectation from '#component/KnotSpectation'

/** Knottingham’s one room: its hall and lighting, the Knots’ announcements and the exhibition, which a reset builds anew. */
export default function ArenaRoom() {
  return <>
    <Lobby />
    <KnotSpectation />
    <KnotExhibition />
  </>
}
