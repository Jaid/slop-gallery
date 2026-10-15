import type {ThreeElements} from '@react-three/fiber'

import {registerInteractiveObject} from '#src/lib/gallery/interactiveObjects.ts'

/** Registers a raycast target with the player's existing E action. */
export default function InteractiveObject({action, id, inspectable, onActivate, title, ...props}: Omit<ThreeElements['group'], 'id' | 'ref'> & {
  /** short verb for what E does, shown in the interaction hint */
  action?: string
  id: string
  /** whether holding V inspects this object */
  inspectable?: boolean
  onActivate: () => void
  /** short display name for the interaction hint */
  title: string
}) {
  return <group
    {...props} ref={group => {
      if (group) {
        return registerInteractiveObject(id, {
          group,
          activate: onActivate,
          action,
          inspectable,
          title,
        })
      }
    }}
  />
}
