import type {RoomId} from '#src/lib/gallery/types.ts'
import type {BufferGeometry, Camera, Light, LightShadow, Object3D} from 'three/webgpu'

import {useThree} from '@react-three/fiber'
import {useEffect} from 'react'
import {Frustum, Matrix4, Sphere, Vector3} from 'three/webgpu'

import {useGallery} from '#src/lib/gallery.ts'
import {roomContaining, roomEnclosing, visibleRooms} from '#src/lib/gallery/roomVisibility.ts'
import {GalleryRenderer} from '#src/lib/rendering/GalleryRenderer.ts'

type ShadowLight = Light & {shadow?: LightShadow}
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
 * Shadows of lights in hidden rooms freeze until their room comes back into view. Lights themselves stay, since a different set of lights would recompile every lit material.
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
    const frozen = new Set<ShadowLight>
    const cull = (camera: Camera) => {
      hidden.clear()
      camera.updateWorldMatrix(true, false)
      const room = roomContaining(camera.getWorldPosition(position).toArray())
      const visible: Set<RoomId> | undefined = room && visibleRooms(room, frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse), camera.coordinateSystem, camera.reversedDepth))
      scene.traverse(object => {
        const light = object as ShadowLight
        if (light.isLight) {
          if (!light.castShadow || !light.shadow) {
            return
          }
          const lightRoom = roomContaining(light.getWorldPosition(position).toArray())
          const freeze = visible !== undefined && lightRoom !== undefined && !visible.has(lightRoom)
          if (freeze && !frozen.has(light)) {
            frozen.add(light)
            light.shadow.autoUpdate = false
          } else if (!freeze && frozen.delete(light)) {
            light.shadow.autoUpdate = true
            light.shadow.needsUpdate = true
          }
          return
        }
        const drawable = object as Drawable
        if (!visible || !drawable.geometry || !drawable.frustumCulled || holdsLight(object)) {
          return
        }
        // Instanced and batched meshes bound all of their instances themselves.
        if (drawable.computeBoundingSphere && drawable.boundingSphere === null) {
          drawable.computeBoundingSphere()
        }
        const {geometry} = drawable
        if (!drawable.boundingSphere && !geometry.boundingSphere) {
          geometry.computeBoundingSphere()
        }
        const objectRoom = roomEnclosing(sphere.copy(drawable.boundingSphere ?? geometry.boundingSphere!).applyMatrix4(object.matrixWorld))
        if (objectRoom && !visible.has(objectRoom)) {
          hidden.add(object)
        }
      })
    }
    galleryRenderer.setCuller(cull)
    return () => {
      galleryRenderer.setCuller(null)
      for (const light of frozen) {
        light.shadow!.autoUpdate = true
        light.shadow!.needsUpdate = true
      }
    }
  }, [galleryRenderer, ready, scene])
  return null
}
