import type {Camera, Material, Object3D, Vector3} from 'three/webgpu'

import {InstancedMesh, Matrix3, Matrix4, Mesh, OrthographicCamera, PerspectiveCamera, Raycaster, Vector2} from 'three/webgpu'

export type AimHit = {
  ancestors: Array<ObjectInfo>
  distance: number
  faceIndex: number | null
  instanceId: number | null
  localPoint: Point3
  material: {index: number
    name: string
    type: string
    uuid: string}
  mesh: ObjectInfo & {geometryType: string}
  normal: Point3 | null
  point: Point3
  uv: [number, number] | null
}
export type AimSnapshot = {
  direction: Point3
  hit: AimHit | null
  hits: Array<AimHit>
  origin: Point3
}

type Point3 = {x: number
  y: number
  z: number}

type Scalar = boolean | number | string | null

type ObjectInfo = {
  id: number
  metadata: Record<string, Scalar>
  name: string
  type: string
  uuid: string
}

function point3(point: Vector3): Point3 {
  return {
    x: point.x,
    y: point.y,
    z: point.z,
  }
}
function objectInfo(object: Object3D): ObjectInfo {
  // Do not expose live scene references or recursively serialize arbitrary userData.
  const data: Record<string, unknown> = object.userData
  const metadata: Record<string, Scalar> = {}
  for (const [key, value] of Object.entries(data)) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value)) {
      Object.defineProperty(metadata, key, {
        value,
        enumerable: true,
        configurable: true,
        writable: true,
      })
    }
  }
  return {
    id: object.id,
    uuid: object.uuid,
    name: object.name,
    type: object.type,
    metadata,
  }
}
function isMesh(object: Object3D): object is Mesh {
  return object instanceof Mesh
}
function visibleMaterial(material: Material) {
  return material.visible && !(material.transparent && material.opacity <= 0)
}

/** On-demand geometric picking, independent of pointer lock, the HUD and physics. */
export default class AimInspector {
  private readonly center = new Vector2(0, 0)
  private readonly raycaster = new Raycaster

  constructor(private readonly scene: Object3D, private readonly camera: Camera) {}

  getAim(): AimSnapshot {
    const {scene, camera, raycaster} = this
    if (!(camera instanceof PerspectiveCamera || camera instanceof OrthographicCamera)) {
      throw new TypeError('Aim inspection requires a perspective or orthographic camera.')
    }
    // Refresh derived transforms even when no animation frame has run since a move.
    scene.updateWorldMatrix(true, true)
    camera.updateWorldMatrix(true, false)
    raycaster.layers.mask = camera.layers.mask
    raycaster.near = camera.near
    raycaster.far = camera.far
    raycaster.setFromCamera(this.center, camera)
    const meshes: Array<Mesh> = []
    scene.traverseVisible(object => {
      if (isMesh(object) && object.layers.test(camera.layers)) {
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        if (materials.some(visibleMaterial)) {
          meshes.push(object)
        }
      }
    })
    const hits: Array<AimHit> = []
    const seen = new Set<string>
    for (const intersection of raycaster.intersectObjects(meshes, false)) {
      const mesh = intersection.object
      if (!isMesh(mesh)) {
        continue
      }
      const materialIndex = intersection.face?.materialIndex ?? 0
      const material = Array.isArray(mesh.material) ? mesh.material[materialIndex] : mesh.material
      if (!material || !visibleMaterial(material)) {
        continue
      }
      const geometryType = mesh.geometry.type
      const instanceId = intersection.instanceId ?? null
      const key = `${mesh.uuid}:${instanceId}`
      // Keep the nearest surface per mesh/instance, not duplicate triangle hits.
      if (seen.has(key)) {
        continue
      }
      seen.add(key)
      const world = mesh.matrixWorld.clone()
      if (mesh instanceof InstancedMesh && instanceId !== null) {
        const instance = new Matrix4
        mesh.getMatrixAt(instanceId, instance)
        world.multiply(instance)
      }
      const localPoint = intersection.point.clone().applyMatrix4(world.clone().invert())
      const normal = intersection.normal?.clone() ?? intersection.face?.normal.clone()
      if (normal) {
        normal.applyNormalMatrix((new Matrix3).getNormalMatrix(world))
        if (normal.dot(raycaster.ray.direction) > 0) {
          normal.negate()
        }
      }
      const ancestors: Array<ObjectInfo> = []
      for (let parent = mesh.parent; parent; parent = parent.parent) {
        ancestors.push(objectInfo(parent))
      }
      hits.push({
        distance: intersection.distance,
        point: point3(intersection.point),
        localPoint: point3(localPoint),
        normal: normal ? point3(normal) : null,
        uv: intersection.uv?.toArray() ?? null,
        faceIndex: intersection.faceIndex ?? null,
        instanceId,
        mesh: {
          ...objectInfo(mesh),
          geometryType,
        },
        ancestors,
        material: {
          uuid: material.uuid,
          name: material.name,
          type: material.type,
          index: materialIndex,
        },
      })
    }
    return {
      origin: point3(raycaster.ray.origin),
      direction: point3(raycaster.ray.direction),
      hit: hits[0] ?? null,
      hits,
    }
  }
}
