import type {ThreeElements} from '@react-three/fiber/webgpu'

import {registerInteractiveObject} from '#src/lib/gallery/interactiveObjects.ts'

/** Registers a raycast target with the player's existing E action. */
export default function InteractiveObject({id, onActivate, ...props}: Omit<ThreeElements['group'], 'id' | 'ref'> & {id: string
  onActivate: () => void}) {
  return <group {...props} ref={group => {
    if (group) {
      return registerInteractiveObject(id, {
        group,
        activate: onActivate,
      })
    }
  }}/>
}
