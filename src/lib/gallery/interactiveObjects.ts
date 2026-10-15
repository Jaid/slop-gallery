import type {Object3D} from 'three/webgpu'

export type InteractiveObject = {
  /** short verb for what E does, shown in the interaction hint; defaults to “Use” */
  action?: string
  activate: () => void
  group: Object3D
  /** whether holding V inspects this object */
  inspectable?: boolean
  /** short display name for the interaction hint */
  title: string
}

export const interactiveObjects = new Map<string, InteractiveObject>
export function registerInteractiveObject(id: string, object: InteractiveObject) {
  interactiveObjects.set(id, object)
  return () => {
    if (interactiveObjects.get(id) === object) {
      interactiveObjects.delete(id)
    }
  }
}

export function activateInteractiveObject(id: string) {
  const object = interactiveObjects.get(id)
  if (!object) {
    return false
  }
  object.activate()
  return true
}
