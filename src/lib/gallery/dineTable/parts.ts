import type {Vec3} from '../types.ts'
import type {BufferGeometry} from 'three/webgpu'

import {BoxGeometry, ExtrudeGeometry, Float32BufferAttribute, Path, Shape, ShapeGeometry} from 'three/webgpu'

/** Grain is baked before assembly, so fibers follow each piece of joinery rather than the whole merged mesh. */
export function timber<T extends BufferGeometry>(geometry: T, axis: 'x' | 'y' | 'z', seed: number) {
  const p = geometry.getAttribute('position')
  const grain = new Float32Array(p.count * 3)
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = [p.getX(i), p.getY(i), p.getZ(i)]
    const along = axis === 'x' ? x : (axis === 'y' ? y : z)
    const across = axis === 'x' ? z + y * 0.3 : (axis === 'y' ? x + z * 0.3 : x + y * 0.3)
    grain.set([along, across, seed], i * 3)
  }
  geometry.setAttribute('woodGrain', new Float32BufferAttribute(grain, 3))
  return geometry
}

/** A closed, softly beveled slab, with its top at y and its long axis along z. */
export function slab(width: number, length: number, thickness: number, radius: number, y: number, bevel = 0.008) {
  const shape = outline(new Shape, width - bevel * 2, length - bevel * 2, radius - bevel)
  const geometry = new ExtrudeGeometry(shape, {
    depth: thickness - bevel * 2,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 1,
    curveSegments: 3,
    steps: 1,
  })
  return geometry.rotateX(-Math.PI / 2).translate(0, y - thickness + bevel, 0)
}

/** Flat brass stringing, slightly above the wood instead of coplanar with it. */
export function stringing(width: number, length: number, radius: number, band: number, y: number) {
  const shape = outline(new Shape, width, length, radius)
  shape.holes.push(outline(new Path, width - band * 2, length - band * 2, radius - band))
  const geometry = new ShapeGeometry(shape, 3)
  return geometry.rotateX(-Math.PI / 2).translate(0, y, 0)
}

export function woodBar(size: Vec3, position: Vec3, axis: 'x' | 'y' | 'z', seed: number) {
  return timber(new BoxGeometry(...size), axis, seed).translate(...position)
}

/** CCW rounded rectangle in x/y, used both for flat stringing and beveled slabs. */
function outline<T extends Path>(path: T, width: number, length: number, radius: number): T {
  const x = width / 2
  const z = length / 2
  path.moveTo(-x + radius, -z)
  path.lineTo(x - radius, -z)
  path.absarc(x - radius, -z + radius, radius, -Math.PI / 2, 0, false)
  path.lineTo(x, z - radius)
  path.absarc(x - radius, z - radius, radius, 0, Math.PI / 2, false)
  path.lineTo(-x + radius, z)
  path.absarc(-x + radius, z - radius, radius, Math.PI / 2, Math.PI, false)
  path.lineTo(-x, -z + radius)
  path.absarc(-x + radius, -z + radius, radius, Math.PI, Math.PI * 1.5, false)
  path.closePath()
  return path
}
