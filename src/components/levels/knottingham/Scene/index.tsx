import KnotExhibition from '#component/levels/knottingham/KnotExhibition'
import Lobby from '#component/levels/knottingham/KnotLobby'
import KnotSpectation from '#component/levels/knottingham/KnotSpectation'
import {useGallery} from '#src/lib/gallery.ts'

export default function KnottinghamScene() {
  const resetEpoch = useGallery(s => s.resetEpoch)
  return <>
    <Lobby/>
    <KnotSpectation/>
    <KnotExhibition key={resetEpoch}/>
  </>
}
