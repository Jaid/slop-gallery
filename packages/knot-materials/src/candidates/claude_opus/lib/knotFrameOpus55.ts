import type {Node} from 'three/webgpu'
import {knotCurve} from '../../../lib/knotCurve.ts'
import {TAU} from '../../../lib/TAU.ts'
/** Tube radius of the exhibition knot, matching `knotGeometryArgs`. */
export const knotTubeRadius = 0.13
/** Curve-angle step TorusKnotGeometry uses to build its frame; `speed` rescales it to object units per UV unit. */
const frameStep = 0.01
/** Object-space tube frame shared by vertex-displacing materials; no screen-space derivatives. */
export function knotFrame(tube:Node<'vec2'>){const angle = tube.x.mul(TAU * 2)
const center = knotCurve(angle)
const next = knotCurve(angle.add(frameStep))
const tangent = next.sub(center)
const binormal = tangent.cross(next.add(center)).normalize()
const frameNormal = binormal.cross(tangent).normalize()
const around = tube.y.mul(TAU)
const normal = frameNormal.mul(around.cos().negate()).add(binormal.mul(around.sin()))
return {binormal,
center,
frameNormal,
normal,
position:center.add(normal.mul(knotTubeRadius)),
/** centerline length per unit of `uv().x` */
speed:tangent.length().mul(TAU * 2 / frameStep),
tangent:tangent.normalize()}}
