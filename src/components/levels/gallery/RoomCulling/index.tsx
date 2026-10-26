import type {ScreenRect} from '#src/lib/gallery/roomVisibility.ts'
import type {RoomId} from '#src/lib/gallery/types.ts'
import type {BufferGeometry, Camera, DirectionalLight, Light, LightShadow, Object3D} from 'three/webgpu'

import {useThree} from '@react-three/fiber'
import {useEffect} from 'react'
import {Box3, Matrix4, Vector3} from 'three/webgpu'

import {useGallery} from '#src/lib/gallery.ts'
import {roomBoxes, roomContaining, roomsAt, roomsOverlapping, screenRect, visibleRegions} from '#src/lib/gallery/roomVisibility.ts'
import {getFloorReflectionHeight} from '#src/lib/materials/FloorMaterial.ts'
import {GalleryRenderer} from '#src/lib/rendering/GalleryRenderer.ts'
import {lightActive} from '#src/lib/rendering/lightLevels.ts'
import ShadowCache from '#src/lib/rendering/ShadowCache.ts'

type Drawable = Object3D & {
  boundingBox?: Box3 | null
  computeBoundingBox?: () => void
  geometry?: BufferGeometry
}
type Placement = {
  bounds: Box3
  matrix: Matrix4
  rooms: ReadonlyArray<RoomId>
  world: Box3
}

const viewProjection = new Matrix4
const position = new Vector3
const mirrored = new Box3
const lightHolders = new WeakMap<Object3D, boolean>
const placements = new WeakMap<Object3D, Placement>
/** the drawable’s world bounds and the rooms they reach into, kept until it moves or its bounds change */
const placementOf = (drawable: Drawable, geometry: BufferGeometry) => {
  // Instanced and batched meshes bound all of their instances themselves.
  if (drawable.computeBoundingBox && drawable.boundingBox === null) {
    drawable.computeBoundingBox()
  }
  if (!drawable.boundingBox && !geometry.boundingBox) {
    geometry.computeBoundingBox()
  }
  const bounds = drawable.boundingBox ?? geometry.boundingBox!
  const cached = placements.get(drawable)
  if (cached?.matrix.equals(drawable.matrixWorld) && cached.bounds.equals(bounds)) {
    return cached
  }
  const world = bounds.clone().applyMatrix4(drawable.matrixWorld)
  const placement = {
    bounds: bounds.clone(),
    matrix: drawable.matrixWorld.clone(),
    rooms: roomsOverlapping(world),
    world,
  }
  placements.set(drawable, placement)
  return placement
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
/** the box mirrored by a floor at the height, as the floor reflection shows it */
const mirror = (box: Box3, floorY: number) => {
  mirrored.copy(box)
  mirrored.min.y = 2 * floorY - box.max.y
  mirrored.max.y = 2 * floorY - box.min.y
  return mirrored
}

/**
 * Leaves out what the camera can’t see from the rooms it is in. An object belongs to every room its bounds reach into, and a room behind an opening only shows through the part of the screen the opening covers, up to two openings deep.
 * Rooms out of sight drop out of every pass of the frame: the camera, its reflection and the lamps’ shadow maps. Objects in a room in sight that miss its openings on screen only drop out of the camera and its reflection, so the shadows they cast stay.
 * The sun shines from outside every room, through openings and skylights that rooms out of sight may frame, so its shadow map keeps them all; otherwise the patches of sunlight would change shape whenever a room leaves the view.
 * Shadow maps only update when something in their light’s reach changes, and lights in hidden rooms or switched off by their room list wait until they matter again. Lights themselves stay, since a different set of lights would recompile every lit material.
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
    const {hidden, hiddenFromView, shadowCameras, unculledCameras} = galleryRenderer
    const shadows = new ShadowCache
    const cull = (camera: Camera) => {
      hidden.clear()
      hiddenFromView.clear()
      camera.updateWorldMatrix(true, false)
      const from = roomsAt(camera.getWorldPosition(position).toArray())
      const regions = from.length ? visibleRegions(from, viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)) : undefined
      // The floor reflection shows the rooms behind openings mirrored by the floors it mirrors, by default those of the room the camera is in.
      const floorY = getFloorReflectionHeight() ?? roomBoxes.find(({id}) => id === from[0])?.floorY ?? 0
      const inSight = (rects: ReadonlyArray<ScreenRect>, box: Box3) => {
        const rect = screenRect(box, viewProjection)
        return rect !== undefined && rects.some(([left, bottom, right, top]) => rect[0] <= right && rect[2] >= left && rect[1] <= top && rect[3] >= bottom)
      }
      scene.traverse(object => {
        const drawable = object as Drawable
        const light = object as Light & {shadow?: LightShadow}
        if (light.isLight && light.shadow) {
          shadowCameras.add(light.shadow.camera)
          if ((light as DirectionalLight).isDirectionalLight) {
            unculledCameras.add(light.shadow.camera)
          }
        }
        if (!regions || !drawable.geometry || !drawable.frustumCulled || holdsLight(object)) {
          return
        }
        const {rooms, world} = placementOf(drawable, drawable.geometry)
        if (!rooms.length || rooms.some(room => from.includes(room))) {
          return
        }
        const rects = rooms.flatMap(room => regions.get(room) ?? [])
        if (!rects.length) {
          hidden.add(object)
        } else if (!inSight(rects, world) && !inSight(rects, mirror(world, floorY))) {
          hiddenFromView.add(object)
        }
      })
      shadows.update(scene, hidden, (light: Light) => {
        if (!lightActive.current(light)) {
          return false
        }
        const lightRoom = regions && roomContaining(position.setFromMatrixPosition(light.matrixWorld).toArray())
        return !lightRoom || regions.has(lightRoom)
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
