import type {Wall, WallOpening} from './walls.ts'

import {BoxGeometry, BufferGeometry, ExtrudeGeometry, MeshBasicMaterial, Shape} from 'three/webgpu'
import {Brush, Evaluator, SUBTRACTION} from 'three-bvh-csg'

export const wallTop = 5.8
export const wallFace = 0.105
const curveSegments = 64

function openingShape(hole: WallOpening, padding = 0, bottom = -0.5) {
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

function extrude(shape: Shape, depth: number, z: number) {
  return new ExtrudeGeometry(shape, {depth, bevelEnabled: false, steps: 1, curveSegments}).translate(0, 0, z)
}

function box(width: number, height: number, depth: number, x: number, y: number, z: number) {
  return new BoxGeometry(width, height, depth).translate(x, y, z)
}

export function colliderGeometry(geometry: BufferGeometry): [Float32Array, Uint32Array] {
  const positions = geometry.getAttribute('position')
  const vertices = Float32Array.from(positions.array)
  const indices = geometry.index ? Uint32Array.from(geometry.index.array) : Uint32Array.from({length: positions.count}, (_, i) => i)
  return [vertices, indices]
}

export type ArchitectureGeometry = ReturnType<typeof createArchitectureGeometry>

// CSG runs once per wall layout, never in the animation loop or on theme changes.
export function createArchitectureGeometry(wall: Wall) {
  const evaluator = new Evaluator
  evaluator.useGroups = false
  const material = new MeshBasicMaterial
  const brushes: Array<Brush> = []
  const retained = new Set<BufferGeometry>
  const brush = (geometry: BufferGeometry) => {
    const result = new Brush(geometry, material)
    result.updateMatrixWorld(true)
    brushes.push(result)
    return result
  }
  const cutters = (wall.holes ?? []).map(hole => brush(extrude(openingShape(hole), 2, -0.5)))
  const cut = (geometry: BufferGeometry) => {
    let result = brush(geometry)
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
    const surface = cut(box(wall.width, wallTop, wallFace, 0, wallTop / 2, wallFace / 2))
    const trim = [
      cut(box(wall.width, 0.38, 0.12, 0, 0.19, 0.14)),
      cut(box(wall.width, 0.06, 0.16, 0, 0.41, 0.17)),
    ]
    for (const hole of wall.holes ?? []) {
      // One continuous arch and both jambs, with the exact same opening as the wall.
      trim.push(cut(extrude(openingShape(hole, 0.17, 0), 0.165, wallFace)))
      for (const side of [-1, 1]) {
        trim.push(cut(box(0.3, 0.4, 0.29, hole.u + side * (hole.width / 2 + 0.085), 0.2, 0.18)))
      }
    }
    const collision = [surface, ...trim].map(colliderGeometry)
    return {
      surface,
      trim,
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
    for (const brush of brushes) {
      brush.disposeCacheData()
      if (!retained.has(brush.geometry)) {
        brush.geometry.dispose()
      }
    }
    material.dispose()
  }
}

const cache = new Map<string, ArchitectureGeometry>
export function architectureGeometry(wall: Wall) {
  const key = JSON.stringify([wall.width, wall.holes ?? []])
  let geometry = cache.get(key)
  if (!geometry) {
    geometry = createArchitectureGeometry(wall)
    cache.set(key, geometry)
  }
  return geometry
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    for (const geometry of cache.values()) {
      geometry.dispose()
    }
    cache.clear()
  })
}
