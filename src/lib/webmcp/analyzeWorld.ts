import type {BufferAttribute, BufferGeometry, InstancedBufferGeometry, InstancedMesh, Light, Material, Mesh, Object3D, SpotLight} from 'three/webgpu'

import {Matrix4, Vector3} from 'three/webgpu'

/** A room’s floor footprint: a closed polygon in world x/z meters, clockwise seen from above, and the clear height above its floor. */
export type WorldRoom = {
  floorY: number
  height: number
  id: string
  polygon: ReadonlyArray<Point>
  title: string
}
export type WorldMesh = {
  /** instances of an instanced mesh whose center lies in this region, otherwise 1 */
  instances: number
  materials: Array<string>
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
  /** meshes and positioned lights whose center lies in no room’s footprint: passages, stairways, the outdoors and walls centered on a room boundary */
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
type Point = readonly [number, number]

const globalLightTypes = new Set(['AmbientLight', 'DirectionalLight', 'HemisphereLight', 'LightProbe'])
const round = (value: number) => Math.round(value * 1e4) / 1e4 + 0
const center = new Vector3
const instanceMatrix = new Matrix4
/** whether the x/z point lies inside the polygon, at least 1 mm from its outline, so walls centered on a shared boundary belong to neither room */
function insidePolygon(x: number, z: number, polygon: ReadonlyArray<Point>) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, az] = polygon[j]
    const [bx, bz] = polygon[i]
    const dx = bx - ax
    const dz = bz - az
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)))
    if (Math.hypot(x - ax - t * dx, z - az - t * dz) < 1e-3) {
      return false
    }
    if (az > z !== bz > z && x < ax + (z - az) / dz * dx) {
      inside = !inside
    }
  }
  return inside
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
const materialsOf = (mesh: Mesh) => [...new Set((Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((material: Material) => material.name || material.type))]
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
 * Sorts every visible mesh and light of the scene into the room whose floor footprint holds its center; where rooms stack, the one nearest in height.
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
  // Where rooms stack, the one whose height range is nearest: crater floors and skylight lamps reach past their room’s range.
  const roomAt = ({x, y, z}: Vector3) => rooms.filter(room => insidePolygon(x, z, room.polygon)).map(room => ({
    id: room.id,
    distance: Math.max(room.floorY - 1 - y, y - room.floorY - room.height - 0.2, 0),
  })).toSorted((a, b) => a.distance - b.distance)[0]?.id
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
    const materials = materialsOf(mesh)
    totals.meshes++
    for (const [room, instances] of counts) {
      const region = regions.get(room)!
      region.meshes.push({
        path,
        instances,
        materials,
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
