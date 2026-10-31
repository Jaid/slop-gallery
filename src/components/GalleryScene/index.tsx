import Architecture from '#component/Architecture'
import Props from '#component/Props'
import RoomCulling from '#component/RoomCulling'
import ShadowPool from '#component/ShadowPool'

export default function GalleryScene() {
  return <>
    <Architecture />
    <RoomCulling />
    <ShadowPool />
    <Props />
  </>
}
