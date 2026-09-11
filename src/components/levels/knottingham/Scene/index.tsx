import KnotExhibition from '#component/levels/knottingham/KnotExhibition'
import Lobby from '#component/levels/knottingham/KnotLobby'
import KnotSpectation from '#component/levels/knottingham/KnotSpectation'
import SoundEffectLab from '#src/components/Scene/SoundEffectLab.tsx'
import {useGallery} from '#src/lib/gallery.ts'

export default function KnottinghamScene() {
  const resetEpoch = useGallery(s => s.resetEpoch)
  return <>
    <Lobby/>
    <SoundEffectLab position={[-28, 2.75, 7.36]} rotationY={Math.PI}/>
    <KnotSpectation/>
    <KnotExhibition key={resetEpoch}/>
  </>
}
