import Architecture from '#component/levels/gallery/Architecture'
import Portrait from '#component/levels/gallery/Portrait'
import Props from '#component/levels/gallery/Props'
import SoundEffectLab from '#component/levels/gallery/SoundEffectLab'
import {useGallery} from '#src/lib/gallery.ts'

export default function GalleryScene() {
  const resetEpoch = useGallery(s => s.resetEpoch)
  const portraits = useGallery(s => s.portraits)
  return <>
    <Architecture/>
    <Props key={resetEpoch}/>
    <SoundEffectLab/>
    {portraits.map(p => <Portrait key={p.id} portrait={p}/>)}
  </>
}
