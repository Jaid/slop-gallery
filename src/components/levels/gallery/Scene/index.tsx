import Architecture from '#component/levels/gallery/Architecture'
import Props from '#component/levels/gallery/Props'
import RoomCulling from '#component/levels/gallery/RoomCulling'
import ShadowPool from '#component/ShadowPool'
import {useGallery} from '#src/lib/gallery.ts'

export default function GalleryScene() {
  const resetEpoch = useGallery(s => s.resetEpoch)
  return <>
    <Architecture />
    <RoomCulling />
    <ShadowPool />
    <Props key={resetEpoch} />
  </>
}
