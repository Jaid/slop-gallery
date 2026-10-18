import type {Wall, WallOpening} from './walls.ts'

import {ADDITION, Brush, Evaluator, SUBTRACTION} from 'three-bvh-csg'
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js'
import {BoxGeometry, BufferGeometry, ExtrudeGeometry, Matrix4, MeshBasicNodeMaterial, Shape, Vector3} from 'three/webgpu'

import {wallFace, wallOpeningTrim} from './architectureDimensions.ts'
import {bendGeometry, curveSegments as bendSegments} from './CurvedBoxGeometry.ts'

export {wallFace, wallOpeningTrim, wallTop} from './architectureDimensions.ts'

const curveSegments = 64
const openingShape = (hole: WallOpening, padding = 0, bottom = hole.bottom ?? -0.5) => {
  const shape = new Shape
  const radius = hole.width / 2 + padding
  shape.moveTo(hole.u - radius, bottom)
  shape.lineTo(hole.u + radius, bottom)
  if (hole.profile === 'arch') {
    const spring = hole.height - hole.width / 2
    shape.lineTo(hole.u + radius, spring)
    shape.absarc(hole.u, spring, radius, 0, Math.PI, false)
  } else {
    shape.lineTo(hole.u + radius, hole.height + padding)
    shape.lineTo(hole.u - radius, hole.height + padding)
  }
  shape.closePath()
  return shape
}
const extrude = (shape: Shape, depth: number, z: number) => {
  const extrudedProfile = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    steps: 1,
    curveSegments,
  })
  return extrudedProfile.translate(0, 0, z)
}

export type ArchitectureGeometry = ReturnType<typeof createArchitectureGeometry>
export function colliderGeometry(geometry: BufferGeometry): [Float32Array, Uint32Array] {
  // UV seams and lathe poles are render attributes, not physical cracks. Weld only
  // positions and remove zero-area faces before Rapier builds its contact topology.
  const surface = new BufferGeometry
  surface.setAttribute('position', geometry.getAttribute('position'))
  surface.setIndex(geometry.index)
  const welded = mergeVertices(surface, 1e-6)
  try {
    const positions = welded.getAttribute('position')
    const vertices = Float32Array.from(positions.array)
    const indices: Array<number> = []
    const source = welded.index!
    const origin = new Vector3
    const ab = new Vector3
    const ac = new Vector3
    for (let i = 0; i < source.count; i += 3) {
      const a = source.getX(i)
      const b = source.getX(i + 1)
      const c = source.getX(i + 2)
      origin.fromBufferAttribute(positions, a)
      ab.fromBufferAttribute(positions, b).sub(origin)
      ac.fromBufferAttribute(positions, c).sub(origin)
      if (ab.cross(ac).lengthSq() > 1e-20) {
        indices.push(a, b, c)
      }
    }
    return [vertices, Uint32Array.from(indices)]
  } finally {
    welded.dispose()
    surface.dispose()
  }
}
// CSG runs once per wall layout, never in the animation loop.
export function createArchitectureGeometry(wall: Wall) {
  const top = wall.height + 0.3
  const baseboardHeight = wall.baseboardHeight ?? 0.44
  if (!Number.isFinite(baseboardHeight) || baseboardHeight <= 0.06) {
    throw new RangeError('A baseboard needs a finite height greater than its 0.06 m cap.')
  }
  if (wall.curveRadius && (wall.holes?.length || wall.baseboardProfile || wall.slope)) {
    throw new RangeError('Curved walls currently need a level rectangular profile without openings.')
  }
  const box = (width: number, height: number, depth: number, x: number, y: number, z: number) => {
    const bendableBlock = new BoxGeometry(width, height, depth, wall.curveRadius ? bendSegments(width, wall.curveRadius) : 1)
    return bendableBlock.translate(x, y, z)
  }
  // A band running the full width ends at 45° in an inside corner, through the corner of both wall faces, meeting the adjoining wall’s band.
  const miter = (geometry: BufferGeometry) => {
    const {miters} = wall
    if (!miters?.some(Boolean)) {
      return geometry
    }
    const position = geometry.getAttribute('position')
    for (let vertex = 0; vertex < position.count; vertex++) {
      const x = position.getX(vertex)
      const side = Math.sign(x)
      if (miters[side < 0 ? 0 : 1] && Math.abs(Math.abs(x) - wall.width / 2) < 1e-6) {
        position.setX(vertex, side * (wall.width / 2 - position.getZ(vertex)))
      }
    }
    geometry.computeVertexNormals()
    return geometry
  }
  const evaluator = new Evaluator
  evaluator.useGroups = false
  const material = new MeshBasicNodeMaterial
  const brushes: Array<Brush> = []
  const retained = new Set<BufferGeometry>
  const brush = (geometry: BufferGeometry) => {
    const result = new Brush(geometry, material)
    result.updateMatrixWorld(true)
    brushes.push(result)
    return result
  }
  const cutters = (wall.holes ?? []).map(hole => brush(extrude(openingShape(hole), 2, -0.5)))
  const cut = (geometry: Brush | BufferGeometry) => {
    let result = geometry instanceof Brush ? geometry : brush(geometry)
    for (const cutter of cutters) {
      const target = brush(new BufferGeometry)
      result = evaluator.evaluate(result, cutter, SUBTRACTION, target)
    }
    result.geometry.computeBoundingBox()
    result.geometry.computeBoundingSphere()
    retained.add(result.geometry)
    return result.geometry
  }
  try {
    // Paired room faces meet at z = 0 instead of occupying overlapping solids.
    const surface = cut(box(wall.width, top, wallFace, 0, top / 2, wallFace / 2))
    // Trim starts at the plaster face so their exposed doorway reveals never overlap.
    const trimBox = (width: number, height: number, front: number, x: number, y: number) => brush(box(width, height, front - wallFace, x, y, (front + wallFace) / 2))
    const baseboardBand = (bottom: number, height: number, front: number) => {
      if (!wall.baseboardProfile) {
        return brush(miter(box(wall.width, height, front - wallFace, 0, bottom + height / 2, (front + wallFace) / 2)))
      }
      // Sweep each band along the actual floor contact instead of burying a
      // horizontal molding in the ramp and exposing a tapering triangular stub.
      const shape = new Shape
      for (const [i, [u, y]] of wall.baseboardProfile.entries()) {
        if (i === 0) {
          shape.moveTo(u, y + bottom)
        } else {
          shape.lineTo(u, y + bottom)
        }
      }
      for (const [u, y] of wall.baseboardProfile.toReversed()) {
        shape.lineTo(u, y + bottom + height)
      }
      shape.closePath()
      return brush(extrude(shape, front - wallFace, wallFace))
    }
    const trim: Array<BufferGeometry> = []
    if (wall.trimStyle !== 'none') {
      let molding = baseboardBand(0, baseboardHeight - 0.06, 0.2)
      const join = (part: Brush) => {
        molding = evaluator.evaluate(molding, part, ADDITION, brush(new BufferGeometry))
      }
      join(baseboardBand(baseboardHeight - 0.06, 0.06, 0.25))
      for (const hole of wall.holes ?? []) {
        const front = wall.trimStyle === 'plain' ? 0.25 : 0.27
        join(brush(extrude(openingShape(hole, wallOpeningTrim, hole.bottom ? hole.bottom - wallOpeningTrim : 0), front - wallFace, wallFace)))
        if (wall.trimStyle !== 'plain' && !hole.bottom) {
          for (const side of [-1, 1]) {
            join(trimBox(0.3, 0.4, 0.325, hole.u + side * (hole.width / 2 + wallOpeningTrim / 2), 0.2))
          }
        }
      }
      // Cut the assembled solid once, leaving a single reveal instead of coplanar faces
      // from the baseboard, arch and plinth. Rendering and collision share this geometry.
      trim.push(cut(molding))
    }
    const glazing = (wall.holes ?? []).filter(hole => hole.glassThickness).map(hole => {
      const bottom = hole.bottom ?? 0
      const geometry = extrude(openingShape(hole, 0, bottom), hole.glassThickness!, (wallFace - hole.glassThickness!) / 2)
      geometry.computeBoundingBox()
      geometry.computeBoundingSphere()
      retained.add(geometry)
      return geometry
    })
    // Raking bands are sheared with the wall rather than rotated: their ends stay plumb and flush with
    // the wall ends, and their vertical section matches the level cornice they meet at a stair landing.
    // Like the baseboards, both bands start at the plaster face, so their ends never share the wall’s end faces. The lower band
    // stands 1 cm proud of a classic opening casing (0.27 m), which can run up into it in low rooms.
    const corniceBand = (height: number, front: number, y: number) => miter(box(wall.width, height, front - wallFace, 0, y, (front + wallFace) / 2))
    const cornice = wall.trimStyle === 'none' ? [] : [corniceBand(0.1, 0.28, wall.height - 0.42), corniceBand(0.23, 0.34, wall.height - 0.22)]
    for (const part of cornice) {
      retained.add(part)
    }
    if (wall.slope) {
      const shear = new Matrix4
      shear.set(1, 0, 0, 0, wall.slope, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)
      for (const geometry of [surface, ...trim, ...glazing, ...cornice]) {
        geometry.applyMatrix4(shear)
        geometry.computeBoundingBox()
        geometry.computeBoundingSphere()
      }
    }
    for (const part of retained) {
      if (wall.curveRadius) {
        bendGeometry(part, wall.curveRadius)
      }
      part.computeBoundingBox()
      part.computeBoundingSphere()
    }
    const collision = [surface, ...trim, ...glazing].map(colliderGeometry)
    return {
      surface,
      cornice,
      trim,
      glazing,
      collision,
      dispose() {
        for (const geometry of retained) {
          geometry.dispose()
        }
      },
    }
  } catch (error) {
    for (const geometry of retained) {
      geometry.dispose()
    }
    throw error
  } finally {
    for (const createdBrush of brushes) {
      createdBrush.disposeCacheData()
      if (!retained.has(createdBrush.geometry)) {
        createdBrush.geometry.dispose()
      }
    }
    material.dispose()
  }
}

const cache = new Map<string, ArchitectureGeometry>
export function architectureGeometry(wall: Wall) {
  const key = JSON.stringify([wall.width, wall.height, wall.holes ?? [], wall.slope ?? 0, wall.baseboardProfile ?? null, wall.trimStyle ?? 'classic', wall.curveRadius ?? 0, wall.baseboardHeight ?? 0.44, wall.miters ?? null])
  let geometry = cache.get(key)
  if (!geometry) {
    geometry = createArchitectureGeometry(wall)
    cache.set(key, geometry)
  }
  return geometry
}

// Bun’s types claim import.meta.hot always exists, but outside the Vite dev server it is undefined.
if (import.meta.hot as ImportMeta['hot'] | undefined) {
  import.meta.hot.dispose(() => {
    for (const geometry of cache.values()) {
      geometry.dispose()
    }
    cache.clear()
  })
}
