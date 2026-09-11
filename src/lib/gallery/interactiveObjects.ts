import type {Object3D} from 'three/webgpu'

export type InteractiveObject = {
  activate: () => void
  group: Object3D
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
