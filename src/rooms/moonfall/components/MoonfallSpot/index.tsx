import {useState} from 'react'
import {Object3D} from 'three/webgpu'

import {rooms} from '#src/lib/gallery.ts'
import {useShadowProps} from '#src/lib/rendering/shadowFilters.ts'

const room = rooms.find(candidate => candidate.id === 'moonfall')!
/** Moonfall’s lights only shine while the player is in Moonfall or the Oculus. */
export const moonfallLightRooms = {rooms: ['moonfall', 'oculus']} as const
const moonfallLightTarget = () => {
  const target = new Object3D
  target.position.set(0, -1.5, 0)
  return target
}

/** Moonfall’s spotlight. Its shadow takes a lights node of its own in every lit material, so it comes with the page: mounting it later with the rest of Moonfall would rebuild all of them. */
export default function MoonfallSpot() {
  const [target] = useState(moonfallLightTarget)
  const shadow = useShadowProps(2048)
  return <group name='moonfall-spot' position={[room.center[0], room.floorY, room.center[1]]}>
    <primitive object={target} />
    <spotLight angle={0.9} castShadow color='#e0d0b2' distance={15} intensity={860} penumbra={0.28} position={[-7, 3.3, -4]} shadow-bias={-0.0001} shadow-normalBias={0.025} target={target} userData={moonfallLightRooms} {...shadow} />
  </group>
}
