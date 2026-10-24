import type {AimHit} from './AimInspector.ts'
import type {EgoAction, EgoInput, EgoPoint, EgoState} from './types.ts'
import type {Camera, Object3D} from 'three/webgpu'

import composeId from 'compose-id'
import {Euler, OrthographicCamera, PerspectiveCamera, Quaternion, Vector3} from 'three/webgpu'

import AimInspector from './AimInspector.ts'

export type EgoDump = ReturnType<EgoDiagnostics['capture']>
export type EgoDumpHit = ReturnType<typeof compactHit>

type Scalar = boolean | number | string | null

/** decimals for lengths in meters: millimeters */
const lengthDigits = 3
/** decimals for unit vectors, angles in radians and UVs: below a pixel at any common FOV */
const angleDigits = 4
/** Round `value` to `digits` decimals, without negative zero, so float noise such as 6e-17 disappears. */
function round(value: number, digits: number) {
  return Number(value.toFixed(digits)) || 0
}
function roundPoint(point: EgoPoint, digits = lengthDigits) {
  return {
    x: round(point.x, digits),
    y: round(point.y, digits),
    z: round(point.z, digits),
  }
}
function isSamePoint(a: EgoPoint, b: EgoPoint) {
  return a.x === b.x && a.y === b.y && a.z === b.z
}
/** Shrink a raycast hit to what tells the surface apart: rounded geometry, the named scene path and the merged scalar metadata. Session-local IDs and UUIDs, unnamed wrappers, the scene root and values that repeat others are left out. */
function compactHit(hit: AimHit) {
  const point = roundPoint(hit.point)
  const localPoint = roundPoint(hit.localPoint)
  const path: Array<string> = []
  const metadata: Record<string, Scalar> = {}
  // Ancestors run from the parent up to the scene root; nearer objects win metadata conflicts.
  for (const object of [hit.mesh, ...hit.ancestors]) {
    if (object.type === 'Scene') {
      continue
    }
    if (object !== hit.mesh && object.name) {
      path.unshift(object.name)
    }
    for (const [key, value] of Object.entries(object.metadata)) {
      if (!(key in metadata)) {
        metadata[key] = value
      }
    }
  }
  return {
    distance: round(hit.distance, lengthDigits),
    point,
    // Equal for meshes whose geometry is baked in world space.
    ...isSamePoint(point, localPoint) ? {} : {localPoint},
    ...hit.normal ? {normal: roundPoint(hit.normal, angleDigits)} : {},
    ...hit.uv ? {uv: hit.uv.map(value => round(value, angleDigits)) as [number, number]} : {},
    ...hit.faceIndex === null ? {} : {faceIndex: hit.faceIndex},
    ...hit.instanceId === null ? {} : {instanceId: hit.instanceId},
    mesh: hit.mesh.name,
    path,
    ...Object.keys(metadata).length ? {metadata} : {},
    // An unnamed material’s type and UUID tell nothing that survives the session.
    ...hit.material.name ? {material: hit.material.name} : {},
    ...hit.material.index ? {materialIndex: hit.material.index} : {},
  }
}

/** Detached, serializable snapshots that reproduce the camera pose and name every surface on the aim ray, rounded to millimeters and sub-pixel angles. */
export default class EgoDiagnostics {
  private readonly inspector: AimInspector

  constructor(scene: Object3D, private readonly camera: Camera) {
    this.inspector = new AimInspector(scene, camera)
  }

  capture(state: EgoState, input: EgoInput) {
    const aim = this.inspector.getAim()
    const {camera} = this
    const capturedAt = new Date
    // Same Euler order as ego-player’s look and the gallery’s location bookmarks.
    const rotation = new Euler
    rotation.setFromQuaternion(camera.getWorldQuaternion(new Quaternion), 'YXZ')
    const roll = round(rotation.z, angleDigits)
    return {
      id: composeId(),
      time: capturedAt.toISOString(),
      player: {
        ...state,
        position: roundPoint(state.position),
        velocity: roundPoint(state.velocity),
      },
      /** active actions */
      input: Object.entries(input).filter(([, active]) => active).map(([action]) => action as EgoAction),
      camera: {
        position: roundPoint(camera.getWorldPosition(new Vector3)),
        yaw: round(rotation.y, angleDigits),
        pitch: round(rotation.x, angleDigits),
        ...roll ? {roll} : {},
        fov: camera instanceof PerspectiveCamera ? round(camera.fov, angleDigits) : null,
        aspect: camera instanceof PerspectiveCamera ? round(camera.aspect, angleDigits) : null,
        near: camera instanceof PerspectiveCamera || camera instanceof OrthographicCamera ? camera.near : null,
        far: camera instanceof PerspectiveCamera || camera instanceof OrthographicCamera ? camera.far : null,
      },
      /** visible mesh/instance surfaces along the aim ray, near to far */
      hits: aim.hits.map(compactHit),
    }
  }
}
