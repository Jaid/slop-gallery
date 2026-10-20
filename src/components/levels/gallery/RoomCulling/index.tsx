import type {RoomId} from '#src/lib/gallery/types.ts'
import type {BufferGeometry, Camera, Light, Object3D} from 'three/webgpu'

import {useThree} from '@react-three/fiber'
import {useEffect} from 'react'
import {Frustum, Matrix4, Sphere, Vector3} from 'three/webgpu'

import {useGallery} from '#src/lib/gallery.ts'
import {roomContaining, roomEnclosing, visibleRooms} from '#src/lib/gallery/roomVisibility.ts'
import {GalleryRenderer} from '#src/lib/rendering/GalleryRenderer.ts'
import ShadowCache from '#src/lib/rendering/ShadowCache.ts'

type Drawable = Object3D & {
  boundingSphere?: Sphere | null
  computeBoundingSphere?: () => void
  geometry?: BufferGeometry
}

const frustum = new Frustum
const projection = new Matrix4
const sphere = new Sphere
const position = new Vector3
const lightHolders = new WeakMap<Object3D, boolean>
const objectRooms = new WeakMap<Object3D, {
  bounds: Sphere
  matrix: Matrix4
  room: RoomId | undefined
}>
/**
 * The room that encloses the drawable, kept until it moves or its bounds change.
 *
 * Long, low furniture has a bounding sphere that reaches far below the floor, past every room box, although the furniture itself stays inside one room. Such objects declare their room in `userData.room`, which wins over the sphere.
 */
const roomOf = (drawable: Drawable, geometry: BufferGeometry) => {
  const declared = (drawable.userData as {room?: RoomId}).room
  if (declared) {
    return declared
  }
  // Instanced and batched meshes bound all of their instances themselves.
  if (drawable.computeBoundingSphere && drawable.boundingSphere === null) {
    drawable.computeBoundingSphere()
  }
  if (!drawable.boundingSphere && !geometry.boundingSphere) {
    geometry.computeBoundingSphere()
  }
  const bounds = drawable.boundingSphere ?? geometry.boundingSphere!
  const cached = objectRooms.get(drawable)
  if (cached?.matrix.equals(drawable.matrixWorld) && cached.bounds.equals(bounds)) {
    return cached.room
  }
  const room = roomEnclosing(sphere.copy(bounds).applyMatrix4(drawable.matrixWorld))
  objectRooms.set(drawable, {
    bounds: bounds.clone(),
    matrix: drawable.matrixWorld.clone(),
    room,
  })
  return room
}
const holdsLight = (object: Object3D) => {
  let result = lightHolders.get(object)
  if (result === undefined) {
    result = false
    object.traverse(child => {
      result ||= (child as Light).isLight
    })
    lightHolders.set(object, result)
  }
  return result
}

/**
 * Leaves out the rooms the camera can’t see from the room it is in, from every pass of the frame: the camera, its reflection and all shadow maps.
 * Shadow maps only update when something in their light’s reach changes, and lights in hidden rooms wait until their room comes back into view. Lights themselves stay, since a different set of lights would recompile every lit material.
 */
export default function RoomCulling() {
  const renderer = useThree(state => state.renderer)
  const scene = useThree(state => state.scene)
  const ready = useGallery(s => s.ready)
  const galleryRenderer = renderer instanceof GalleryRenderer ? renderer : null
  useEffect(() => {
    if (!ready || !galleryRenderer) {
      return
    }
    const {hidden} = galleryRenderer
    const shadows = new ShadowCache
    const cull = (camera: Camera) => {
      hidden.clear()
      camera.updateWorldMatrix(true, false)
      const room = roomContaining(camera.getWorldPosition(position).toArray())
      const visible: Set<RoomId> | undefined = room && visibleRooms(room, frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse), camera.coordinateSystem, camera.reversedDepth))
      scene.traverse(object => {
        const drawable = object as Drawable
        if (!visible || !drawable.geometry || !drawable.frustumCulled || holdsLight(object)) {
          return
        }
        const objectRoom = roomOf(drawable, drawable.geometry)
        if (objectRoom && !visible.has(objectRoom)) {
          hidden.add(object)
        }
      })
      shadows.update(scene, hidden, (light: Light) => {
        const lightRoom = visible && roomContaining(position.setFromMatrixPosition(light.matrixWorld).toArray())
        return !lightRoom || visible.has(lightRoom)
      })
    }
    galleryRenderer.setCuller(cull)
    return () => {
      galleryRenderer.setCuller(null)
      shadows.dispose()
    }
  }, [galleryRenderer, ready, scene])
  return null
}
