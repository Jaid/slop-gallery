import type {Object3D} from 'three/webgpu'

/** A mesh path with its slash-separated segments trimmed and empty ones dropped, or undefined when nothing is left. */
export function normalizeMeshPath(value: unknown) {
  if (typeof value !== 'string') {
    return
  }
  const segments = value.split('/').map(segment => segment.trim()).filter(Boolean)
  if (segments.length > 0) {
    return segments.join('/')
  }
}

/** Whether an object’s name and the names of its nearest ancestors end in the path’s slash-separated segments. */
export function matchesMeshPath(object: Object3D, path: string) {
  let current: Object3D | null = object
  for (const segment of path.split('/').toReversed()) {
    if (current?.name !== segment) {
      return false
    }
    current = current.parent
  }
  return true
}

/** Every object at the end of the mesh path, together with everything below it. */
export function collectMeshPath(root: Object3D, path: string) {
  const objects: Array<Object3D> = []
  root.traverse(object => {
    if (matchesMeshPath(object, path)) {
      object.traverse(descendant => {
        objects.push(descendant)
      })
    }
  })
  return objects
}
