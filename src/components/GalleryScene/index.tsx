import Architecture from '#component/Architecture'
import Props from '#component/Props'
import RoomCulling from '#component/RoomCulling'
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
