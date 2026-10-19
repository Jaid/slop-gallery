import type {BufferGeometry, Node} from 'three/webgpu'

import {attribute, float, normalView, positionGeometry, positionView, select, vec3} from 'three/tsl'
import {Float32BufferAttribute} from 'three/webgpu'

/**
 * The direction a metal was brushed or turned in.
 *
 * Everything is derived from the geometry’s own positions through screen-space derivatives, so the grain follows the mesh through any model or instance transform – including instanced props that get picked up and thrown – and needs neither UVs nor tangents.
 */
export type Grain = {
  /** view-space unit direction within the surface across the marks, the direction in which they spread highlights */
  across: Vec3
  /** geometry-space coordinates in meters in which the finishing marks are thin along x and y and long along z */
  coordinate: Vec3
  /** 0–1 how clearly the marks run within the surface; 0 where they run straight into it, like on the cut end of a brushed bar */
  strength: Float
}
type Float = Node<'float'>
type Vec3 = Node<'vec3'>

type Axis = readonly [number, number, number] | Vec3

/**
 * View-space surface gradient of a scalar field: the direction within the surface in which `field` grows, scaled by how fast it grows per view-space meter.
 *
 * Built from screen-space derivatives (Mikkelsen’s surface gradient), it holds for any transform. It is solved in the plane of the rendered triangle, where a linearly interpolated field truly is linear: solved against the smoothly interpolated normal instead, the result would tilt differently on every facet of a curved mesh, which shows as stripes in anisotropic highlights.
 */
export const surfaceGradient = (field: Float) => {
  const sigmaX = positionView.dFdx()
  const sigmaY = positionView.dFdy()
  const facet = sigmaX.cross(sigmaY)
  const r1 = sigmaY.cross(facet)
  const r2 = facet.cross(sigmaX)
  const determinant = sigmaX.dot(r1)
  const gradient = field.dFdx().mul(r1).add(field.dFdy().mul(r2))
  return gradient.div(select(determinant.abs().lessThan(1e-30), float(1e-30), determinant))
}
/** Projects a view-space direction into the smoothly shaded surface, which the lighting works in. */
const intoSurface = (direction: Vec3) => direction.sub(normalView.mul(normalView.dot(direction)))
/**
 * The view-space image of a geometry-space direction, projected into the surface, and the share of it that lies within the surface.
 *
 * The surface gradients of the three geometry coordinates are the in-surface images of the geometry axes, scaled by the inverse of the object’s scale. Their squared lengths always add up to twice that inverse scale squared, which recovers the scale without knowing the transform. This holds for rotations and uniform scales, which is all the gallery uses on metal.
 */
const projectGeometryDirection = (direction: Vec3) => {
  const gx = surfaceGradient(positionGeometry.x)
  const gy = surfaceGradient(positionGeometry.y)
  const gz = surfaceGradient(positionGeometry.z)
  const image = gx.mul(direction.x).add(gy.mul(direction.y)).add(gz.mul(direction.z))
  const unitLength = gx.dot(gx).add(gy.dot(gy)).add(gz.dot(gz)).mul(0.5).sqrt().max(1e-9)
  const length = image.length()
  return {
    direction: image.div(length.max(1e-9)),
    share: length.div(unitLength).div(direction.length().max(1e-9)),
  }
}
/**
 * The in-surface direction across marks that run along `marks`.
 *
 * Where the marks have no direction within the surface, like on the cut end of a brushed bar, any tangent will do: the anisotropy there is 0, but the lighting still needs a valid frame instead of a zero vector that would turn the pixel into NaN.
 */
const acrossMarks = (marks: Vec3) => {
  const across = normalView.cross(marks)
  const fallback = normalView.cross(select(normalView.y.abs().lessThan(0.9), vec3(0, 1, 0), vec3(1, 0, 0)))
  return select(across.length().greaterThan(1e-4), across, fallback).normalize()
}
const toNode = (axis: Axis) => (Array.isArray(axis) ? vec3(...axis as [number, number, number]) : axis as Vec3)
const grainFrom = (marks: Vec3, coordinate: Vec3): Grain => {
  const projected = projectGeometryDirection(marks)
  return {
    across: acrossMarks(intoSurface(projected.direction)),
    strength: projected.share.smoothstep(0.3, 0.8),
    coordinate,
  }
}

type GrainMark = {
  axis: readonly [number, number, number]
  /** a point on the lathe axis, for turned parts */
  center?: readonly [number, number, number]
  kind: 'brushed' | 'turned'
}

/** Brushed in straight strokes along the geometry-space `axis`, like a sanded bar or a grained sheet. */
export function brushedAlong(axis: Axis) {
  const direction = toNode(axis).normalize()
  const along = positionGeometry.dot(direction)
  const across = positionGeometry.sub(direction.mul(along))
  // Mixing the across coordinates keeps the strokes thin whichever way the axis points.
  return grainFrom(direction, vec3(across.x.add(across.z.mul(0.61)), across.y.add(across.x.mul(0.53)), along))
}

/** Turned on a lathe around the geometry-space `axis` through `center`: concentric rings on faces across the axis, fine circles around its flanks. */
export function turnedAround(axis: Axis, center: Axis = [0, 0, 0]) {
  const direction = toNode(axis).normalize()
  const offset = positionGeometry.sub(toNode(center))
  const height = offset.dot(direction)
  // The tool marks run around the axis; on the axis itself they have no direction and fade out.
  const around = direction.cross(offset)
  const radius = around.length()
  return grainFrom(around.div(radius.max(1e-4)).mul(radius.smoothstep(0, 0.002)), vec3(radius, height, 0))
}

/** A grain per part of a merged geometry, as written by {@link setGrain}: brushed along or turned around each part’s own axis. */
export function geometryGrain(): Grain {
  const axis = attribute<'vec4'>('grainAxis', 'vec4')
  const center = attribute<'vec3'>('grainCenter', 'vec3')
  // Already a unit vector, as setGrain writes it; meshes without the attribute read a zero axis and get no grain.
  const direction = axis.xyz
  const offset = positionGeometry.sub(center)
  const height = offset.dot(direction)
  const turned = axis.w.greaterThan(0.5)
  const around = direction.cross(offset)
  const radius = around.length()
  const across = offset.sub(direction.mul(height))
  // One projection serves both kinds, which keeps the merged shader to a single set of derivatives.
  const marks = select(turned, around.div(radius.max(1e-4)).mul(radius.smoothstep(0, 0.002)), direction)
  const coordinate = select(turned, vec3(radius, height, 0), vec3(across.x.add(across.z.mul(0.61)), across.y.add(across.x.mul(0.53)), height))
  return grainFrom(marks, coordinate)
}

/**
 * Marks the vertices of a geometry part as brushed along, or turned around, a geometry-space axis, for {@link geometryGrain} after merging.
 *
 * A function marks every vertex on its own, for parts whose grain bends, like a swept tube brushed along its path: the axis is interpolated between vertices, so the grain follows the bend smoothly.
 */
export function setGrain<T extends BufferGeometry>(geometry: T, grain: ((vertex: number) => GrainMark) | GrainMark) {
  const count = geometry.getAttribute('position').count
  const axis = new Float32Array(count * 4)
  const center = new Float32Array(count * 3)
  for (let index = 0; index < count; index++) {
    const mark = typeof grain === 'function' ? grain(index) : grain
    const length = Math.hypot(...mark.axis)
    if (!(length > 0)) {
      throw new RangeError('A grain axis needs a length.')
    }
    axis.set([mark.axis[0] / length, mark.axis[1] / length, mark.axis[2] / length, mark.kind === 'turned' ? 1 : 0], index * 4)
    center.set(mark.center ?? [0, 0, 0], index * 3)
  }
  geometry.setAttribute('grainAxis', new Float32BufferAttribute(axis, 4))
  geometry.setAttribute('grainCenter', new Float32BufferAttribute(center, 3))
  return geometry
}
