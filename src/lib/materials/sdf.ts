import type {Node} from 'three/webgpu'

import {atan, max, vec2} from 'three/tsl'

/**
 * Signed distance fields for flat ornament, in whatever unit the point is given in.
 *
 * Negative inside. Shapes built from them are meant to be drawn with the pixel-filtered `inside()` from `filters.ts`, which only needs the field to grow at roughly the rate of the true distance near the edge, so smooth approximations are fine.
 */
type Float = Node<'float'>
type Vec2 = Node<'vec2'>
type Point = readonly [number, number] | Vec2

const toVec2 = (point: Point): Vec2 => {
  if (Array.isArray(point)) {
    const [x, y] = point as readonly [number, number]
    return vec2(x, y)
  }
  return point as Vec2
}

/** The point in a frame turned by `angle` radians, so that direction becomes the frame’s x axis. */
export const turn = (p: Vec2, angle: number) => {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return vec2(p.x.mul(c).add(p.y.mul(s)), p.y.mul(c).sub(p.x.mul(s)))
}
export const circle = (p: Vec2, center: Point, radius: Float | number) => p.sub(toVec2(center)).length().sub(radius)
/** An approximate distance to an axis-aligned ellipse. */
export const ellipse = (p: Vec2, center: Point, radiusX: number, radiusY: number) => p.sub(toVec2(center)).div(vec2(radiusX, radiusY)).length().sub(1).mul(Math.min(radiusX, radiusY))
/** A pointed leaf (vesica) of half-length `length` and half-width `width`, pointing along `angle`. */
export const leaf = (p: Vec2, center: Point, length: number, width: number, angle = 0) => {
  const q = turn(p.sub(toVec2(center)), angle)
  const radius = (length * length + width * width) / (2 * width)
  return vec2(q.x, q.y.abs().add(radius - width)).length().sub(radius)
}
/** A stroke of half-width `width` along a circle, kept on the side of its center that `facing` (radians) points to. */
export const arc = (p: Vec2, center: Point, radius: number, width: number, facing: number) => {
  const q = p.sub(toVec2(center))
  const side = q.dot(vec2(Math.cos(facing), Math.sin(facing)))
  return max(q.length().sub(radius).abs().sub(width), side.negate())
}
/** A rosette of `petals` round petals reaching `radius`; `depth` (0–1) is how deep the gaps between them cut in. */
export const rosette = (p: Vec2, petals: number, radius: number, depth: number) => {
  const angle = atan(p.y, p.x)
  return p.length().sub(angle.mul(petals / 2).cos().abs().mul(depth).add(1 - depth).mul(radius))
}
/** Repeats space every `period`, centering every cell on the origin. */
export const repeat = (value: Float, period: number) => value.div(period).add(0.5).fract().sub(0.5).mul(period)

export const subtract = (shape: Float, cut: Float) => max(shape, cut.negate())
export const unite = (...shapes: Array<Float>) => shapes.reduce((a, b) => a.min(b))
/** Distance to the curve x = f(y), from the value and slope of f at the point’s height. */
export const curveDistance = (x: Float, f: Float, slope: Float) => x.sub(f).abs().div(slope.mul(slope).add(1).sqrt())
