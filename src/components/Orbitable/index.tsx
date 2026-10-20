import type {OrbitSettings} from '#src/lib/camera/OrbitInspection.ts'
import type {Vec3} from '#src/lib/gallery.ts'
import type {ThreeElements} from '@react-three/fiber'

import {registerOrbitable} from '#src/lib/gallery/orbitables.ts'

/** Lets holding V orbit around a fixed object that can’t be grabbed. */
export default function Orbitable({id, center, orbit, title, ...props}: Omit<ThreeElements['group'], 'id' | 'ref'> & {
  /** where the orbit centers, relative to the group */
  center?: Vec3
  id: string
  orbit: OrbitSettings
  /** short display name for the interaction hint */
  title: string
}) {
  return <group
    {...props} ref={group => {
      if (group) {
        return registerOrbitable(id, {
          center,
          group,
          orbit,
          title,
        })
      }
    }}
  />
}
