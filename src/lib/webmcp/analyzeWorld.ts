import type {BufferAttribute, BufferGeometry, InstancedBufferGeometry, InstancedMesh, Light, Material, Mesh, Object3D, SpotLight} from 'three/webgpu'

import {Matrix4, Vector3} from 'three/webgpu'

/** an axis-aligned box in world meters, from the floor to the clear height of the space it covers */
export type WorldBox = {
  max: [number, number, number]
  min: [number, number, number]
}
/** a room as the union of its fence’s boxes */
export type WorldRoom = {
  fence: Arrayable<WorldBox>
  id: string
  title: string
}
export type WorldMesh = {
  /** instances of an instanced mesh whose center lies in this region, otherwise 1 */
  instances: number
  /** material name or type, a list for several; left out where it is the plain MeshStandardNodeMaterial */
  material?: Array<string> | string
  /** names of the mesh and its named ancestors, outermost first */
  path: string
  /** triangles drawn for these instances */
  triangles: number
}
export type WorldLight = {
  angle?: number
  castShadow: boolean
  color: string
  decay?: number
  distance?: number
  intensity: number
  path: string
  penumbra?: number
  position: [number, number, number]
  type: string
}
export type WorldRegion = {
  lights: Array<WorldLight>
  /** sorted by triangles, most first */
  meshes: Array<WorldMesh>
  triangles: number
}
export type WorldAnalysis = {
  /** meshes and positioned lights whose center lies outside every room’s fence seen from above: passages, stairways, the outdoors and walls centered on a room boundary */
  elsewhere: WorldRegion
  /** ambient, hemisphere and directional lights, which light the world without a place in it */
  globalLights: Array<WorldLight>
  rooms: Array<WorldRegion & WorldRoom>
  totals: {
    instances: number
    lights: number
    meshes: number
    triangles: number
  }
}
type Arrayable<T> = Array<T> | T

const globalLightTypes = new Set(['AmbientLight', 'DirectionalLight', 'HemisphereLight', 'LightProbe'])
const round = (value: number) => Math.round(value * 1e4) / 1e4 + 0
const center = new Vector3
const instanceMatrix = new Matrix4
/** how far the point lies above or below the box, with a meter below its floor and 20 cm above its top to spare; undefined unless it is at least 1 mm inside the box seen from above, so walls centered on a shared boundary belong to neither room */
function verticalDistance({x, y, z}: Vector3, {min, max}: WorldBox) {
  if (x > min[0] + 1e-3 && x < max[0] - 1e-3 && z > min[2] + 1e-3 && z < max[2] - 1e-3) {
    return Math.max(min[1] - 1 - y, y - max[1] - 0.2, 0)
  }
}
const pathOf = (object: Object3D) => {
  const names: Array<string> = []
  for (let current: Object3D | null = object; current; current = current.parent) {
    if (current.name) {
      names.unshift(current.name)
    }
  }
  if (!object.name) {
    names.push(object.type)
  }
  return names.join('/')
}
/** triangles of one draw of the geometry, within its draw range */
const trianglesOf = (geometry: BufferGeometry) => {
  const position = geometry.getAttribute('position') as BufferAttribute | undefined
  const count = geometry.index?.count ?? position?.count ?? 0
  const drawn = Math.min(count - geometry.drawRange.start, geometry.drawRange.count)
  const {instanceCount} = geometry as Partial<InstancedBufferGeometry>
  const instances = instanceCount !== undefined && Number.isFinite(instanceCount) ? instanceCount : 1
  return Math.floor(Math.max(drawn, 0) / 3) * instances
}
const materialOf = (mesh: Mesh) => {
  const names = [...new Set((Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((material: Material) => material.name || material.type))].filter(name => name !== 'MeshStandardNodeMaterial')
  return names.length > 1 ? names : names.at(0)
}
const describeLight = (light: Light): WorldLight => {
  const spot = light as SpotLight
  return {
    type: light.type,
    path: pathOf(light),
    position: light.getWorldPosition(center).toArray().map(round) as [number, number, number],
    color: `#${light.color.getHexString()}`,
    intensity: round(light.intensity),
    ...'distance' in light ? {
      distance: round(spot.distance),
      decay: round(spot.decay),
    } : {},
    ...spot.isSpotLight ? {
      angle: round(spot.angle),
      penumbra: round(spot.penumbra),
    } : {},
    castShadow: light.castShadow,
  }
}

/**
 * Sorts every visible mesh and light of the scene into the room whose fence holds its center; where none does, the room above or below it nearest in height.
 * Instanced meshes are sorted per instance. Counts follow the geometry’s draw range and instance count, not what culling skips in a given frame.
 */
export default function analyzeWorld(scene: Object3D, rooms: ReadonlyArray<WorldRoom>): WorldAnalysis {
  scene.updateMatrixWorld()
  const regions = new Map<string | undefined, WorldRegion>([...rooms.map(room => room.id), undefined].map(id => [id, {
    triangles: 0,
    meshes: [],
    lights: [],
  }]))
  const globalLights: Array<WorldLight> = []
  // Crater floors and skylight lamps reach past their room’s fence, so the nearest box above or below the point counts too.
  const roomAt = (point: Vector3) => {
    let result: {
      distance: number
      id: string
    } | undefined
    for (const room of rooms) {
      for (const box of [room.fence].flat()) {
        const distance = verticalDistance(point, box)
        if (distance !== undefined && (!result || distance < result.distance)) {
          result = {
            id: room.id,
            distance,
          }
        }
      }
    }
    return result?.id
  }
  const totals = {
    meshes: 0,
    instances: 0,
    triangles: 0,
    lights: 0,
  }
  scene.traverseVisible(object => {
    if ((object as Light).isLight) {
      const light = describeLight(object as Light)
      totals.lights++
      if (globalLightTypes.has(light.type)) {
        globalLights.push(light)
      } else {
        regions.get(roomAt(center.fromArray(light.position)))!.lights.push(light)
      }
      return
    }
    if (!(object as Partial<Mesh>).isMesh) {
      return
    }
    const mesh = object as Mesh
    const {geometry} = mesh
    if (!geometry.boundingSphere) {
      geometry.computeBoundingSphere()
    }
    const bounds = geometry.boundingSphere!
    const triangles = trianglesOf(geometry)
    const instanced = (mesh as Partial<InstancedMesh>).isInstancedMesh ? mesh as InstancedMesh : undefined
    const counts = new Map<string | undefined, number>
    for (let i = 0; i < (instanced?.count ?? 1); i++) {
      center.copy(bounds.center)
      if (instanced) {
        instanced.getMatrixAt(i, instanceMatrix)
        center.applyMatrix4(instanceMatrix)
      }
      const room = roomAt(center.applyMatrix4(mesh.matrixWorld))
      counts.set(room, (counts.get(room) ?? 0) + 1)
    }
    const path = pathOf(mesh)
    const material = materialOf(mesh)
    totals.meshes++
    for (const [room, instances] of counts) {
      const region = regions.get(room)!
      region.meshes.push({
        path,
        instances,
        ...material === undefined ? {} : {material},
        triangles: triangles * instances,
      })
      region.triangles += triangles * instances
      totals.instances += instances
      totals.triangles += triangles * instances
    }
  })
  for (const region of regions.values()) {
    region.meshes.sort((a, b) => b.triangles - a.triangles)
  }
  return {
    totals,
    rooms: rooms.map(room => ({
      ...room,
      ...regions.get(room.id)!,
    })),
    elsewhere: regions.get(undefined)!,
    globalLights,
  }
}
