import type {PoppingLantern} from './flights.ts'
import type {Node} from 'three/webgpu'

import {attribute, exp, float, max, mix, mx_noise_float, positionGeometry, select, sin, smoothstep, uv, vec2, vec3} from 'three/tsl'
import {PlaneGeometry} from 'three/webgpu'

import {coverage, rgb, turn} from '#src/lib/materials/orb/fill.ts'

import {portalPoint, uprightAxes} from '../base/billboards.ts'
import EffectSprites, {instanceAttribute} from '../base/EffectSprites.ts'
import {flyingOut, smoking} from './flights.ts'

/** how far a lantern’s quad reaches to either side of its middle, below and above it, in its own units, half its width each, with room for its glow and, above, for its smoke */
const quad = {
  side: 1.6,
  bottom: -1.35,
  top: 2.7,
} as const
/** the lobes of a pumpkin’s rind, side by side: where their middles are across it and how wide and tall each is, in its own units */
const lobes = [[0, 0.42, 0.72], [0.36, 0.42, 0.68], [-0.36, 0.42, 0.68], [0.6, 0.38, 0.6], [-0.6, 0.38, 0.6]] as const
const rindColors = {
  dark: rgb('#5a1a00'),
  bright: rgb('#e86a0c'),
}
const stemColor = rgb('#3d4a16')
/** the flesh of the carved edges, lit by the candle */
const fleshColor = rgb('#ffbb5c')
const flameColors = {
  deep: rgb('#ff5a08'),
  hot: rgb('#fff1a8'),
}
const glowColor = rgb('#ff7a1a')
const smokeColor = rgb('#b4b0ba')
/** eases from 0 to 1 as `progress` goes from 0 to 1, overshooting a little before it settles */
function overshoot(progress: Node<'float'>) {
  const left = progress.clamp(0, 1).sub(1)
  return left.mul(left).mul(left).mul(2.7).add(left.mul(left).mul(1.7)).add(1)
}
/** the inside of an upright triangle, positive within it, in units of the point: its base `size` / 2 below `center`, its apex `size` above */
function triangle(point: Node<'vec2'>, center: readonly [number, number], size: number) {
  const offset = point.sub(vec2(...center))
  return offset.y.add(size / 2).min(float(size / 2).sub(offset.x.abs().mul(0.866).add(offset.y.mul(0.5))))
}
/**
 * A jack-o’-lantern, in its own units, which run from −1 to 1 across it: the inside of its rind of five lobes, how its lobes bulge toward the viewer, 0–1, the inside of its stem and the inside of its carved face, two triangular eyes, a nose and a grin with three teeth, the right eye shut by `wink`, 0–1.
 */
function jackOLantern(point: Node<'vec2'>, wink: Node<'float'>) {
  const {x, y} = point
  let rind: Node<'float'> = float(-1)
  let bulge: Node<'float'> = float(0)
  for (const [middle, width, height] of lobes) {
    const local = point.sub(vec2(middle, 0)).div(vec2(width, height))
    const inside = float(1).sub(local.length()).mul(width)
    bulge = select(inside.greaterThan(rind), float(1).sub(local.dot(local)).max(0).sqrt(), bulge)
    rind = rind.max(inside)
  }
  const stemPoint = turn(point.sub(vec2(0.04, 0.78)), float(-0.25))
  const stem = float(0.065).sub(stemPoint.x.abs()).min(float(0.14).sub(stemPoint.y.abs()))
  const shut = vec2(x, y.sub(0.16).div(float(1).sub(wink.mul(0.85)).max(0.05)).add(0.16))
  const eyes = triangle(point, [-0.3, 0.16], 0.15).max(select(x.greaterThan(0), triangle(shut, [0.3, 0.16], 0.15), float(-1)))
  const nose = triangle(point, [0, -0.04], 0.08)
  const corner = x.div(0.6)
  const upper = corner.mul(corner).mul(0.2).sub(0.26)
  const lower = upper.sub(float(1).sub(corner.mul(corner)).mul(0.17))
  const grin = upper.sub(y).min(y.sub(lower)).min(float(0.6).sub(x.abs()))
  const teeth = float(0.035).sub(x.abs().sub(0.2).abs()).min(y.sub(upper.sub(0.075)))
    .max(float(0.035).sub(x.abs()).min(lower.add(0.065).sub(y)))
  const mouth = grin.min(teeth.negate())
  return {
    bulge,
    face: eyes.max(nose).max(mouth),
    rind,
    stem,
  }
}

/**
 * Jack-o’-lanterns popping out of a fusion’s portal: each pops out of its middle with a bounce and floats out to its spot round the portal, standing upright as it turns toward the camera, bobbing and swaying, its carved grin lit by a flickering candle; one or two wink, until their candles are blown out one after another, a wisp of smoke curls up and they fade away. Animated entirely on the GPU by the clock.
 */
export default class FloatingLanterns extends EffectSprites {
  constructor(lanterns: ReadonlyArray<PoppingLantern>) {
    const geometry = new PlaneGeometry(1, 1)
    instanceAttribute(geometry, 'lanternTimes', lanterns.map(({blowOut, delay, phase, wink}) => [delay, blowOut, wink ?? -10, phase]))
    instanceAttribute(geometry, 'lanternSpot', lanterns.map(({size, spot}) => [...spot, size]))
    super('fusion-lanterns', geometry, lanterns.length)
    const {material} = this
    const {clock, normal, tangent} = this.uniforms
    const times = attribute<'vec4'>('lanternTimes', 'vec4')
    const placing = attribute<'vec4'>('lanternSpot', 'vec4')
    const [delay, blowOut, winkAt, phase] = [times.x, times.y, times.z, times.w]
    const size = placing.w
    const age = clock.sub(delay)
    const since = age.max(0)
    // It flies out to its spot, overshooting a little, and bobs there.
    const flown = overshoot(since.div(flyingOut))
    const bob = sin(since.mul(2.3).add(phase.mul(Math.PI * 2))).mul(0.035).mul(smoothstep(0, flyingOut, since))
    const center = portalPoint(tangent, normal, placing.x.mul(flown), placing.y.mul(flown).add(bob), placing.z.mul(flown))
    // It pops out with a bounce, swells a little as its candle goes out and shrinks away while it fades.
    const pop = overshoot(since.div(0.3))
    const blown = clock.sub(blowOut)
    const vanishing = smoothstep(0.2, 0.65, blown)
    const unit = size.mul(0.5).mul(pop.mul(0.8).add(0.2)).mul(float(1).sub(vanishing.mul(0.3)))
    const sway = sin(since.mul(1.7).add(phase.mul(9))).mul(0.12)
    const corner = turn(vec2(positionGeometry.x.mul(quad.side * 2), mix(float(quad.bottom), float(quad.top), positionGeometry.y.add(0.5))), sway)
    const {right, up} = uprightAxes(center)
    const placed = center.add(right.mul(corner.x.mul(unit))).add(up.mul(corner.y.mul(unit)))
    material.positionNode = select(age.greaterThan(0), placed, vec3(0, 0, 0))
    const point = vec2(uv().x.sub(0.5).mul(quad.side * 2), mix(float(quad.bottom), float(quad.top), uv().y))
    const winking = smoothstep(0, 0.08, clock.sub(winkAt)).mul(smoothstep(0.32, 0.22, clock.sub(winkAt)))
    const {bulge, face, rind, stem} = jackOLantern(point, winking)
    // The candle catches just after it popped out and flickers, flares as it is blown out and dies.
    const flicker = mx_noise_float(vec3(since.mul(7), phase.mul(13), 0.5)).mul(0.25).add(mx_noise_float(vec3(since.mul(19), phase.mul(13), 3.5)).mul(0.1)).add(0.85)
    const lit = smoothstep(0.12, 0.3, since).mul(float(1).add(smoothstep(-0.08, 0, blown).mul(smoothstep(0.1, 0, blown)).mul(0.6))).mul(smoothstep(0.12, 0, blown))
    const glow = lit.mul(flicker)
    const presence = select(age.greaterThan(0), smoothstep(0, 0.05, age).mul(float(1).sub(vanishing)), float(0))
    const carved = coverage(face)
    const body = coverage(rind.max(stem)).mul(presence)
    const edge = coverage(face.add(0.022)).sub(carved).clamp(0, 1)
    // The rind glows from within around the carving.
    const spill = exp(face.negate().max(0).mul(-14)).mul(glow).mul(0.6)
    const rindColor = mix(rindColors.dark, rindColors.bright, bulge.pow(0.7)).mul(float(1).add(spill)).add(glowColor.mul(spill).mul(0.25))
    const shell = mix(rindColor, stemColor, coverage(stem))
    const flame = mix(flameColors.deep, flameColors.hot, smoothstep(0, 0.07, face).mul(glow)).mul(glow.mul(3.5)).add(rindColors.dark.mul(0.25))
    const surface = mix(mix(shell, fleshColor.mul(glow.mul(1.8).add(0.35)), edge), flame, carved)
    // Light spills out around it while its candle burns.
    const outside = rind.negate().max(0)
    const halo = exp(outside.mul(-9)).mul(smoothstep(0.42, 0.15, outside)).mul(glow).mul(float(1).sub(body)).mul(presence).mul(0.3)
    // Once blown out, a wisp of smoke curls up from where its stem was and thins out.
    const rising = blown.max(0)
    const height = point.y.sub(0.8)
    const curl = sin(height.mul(4).sub(rising.mul(3)).add(phase.mul(7))).mul(height.max(0).mul(0.18))
    const swirling = mx_noise_float(vec3(point.x.mul(4), height.mul(2.5).sub(rising.mul(2.2)), phase.mul(5))).mul(0.5).add(0.5)
    const column = smoothstep(float(0.09).add(height.max(0).mul(0.16)), float(0), point.x.sub(curl).abs())
    const smoke = column.mul(swirling).mul(smoothstep(0, 0.12, height)).mul(smoothstep(rising.mul(1.6).add(0.1), rising.mul(1.6).sub(0.2), height)).mul(smoothstep(smoking, smoking * 0.4, rising)).mul(select(blown.greaterThan(0), float(1), float(0))).mul(select(age.greaterThan(0), float(0.7), float(0)))
    const inside = smoothstep(quad.side, quad.side - 0.25, point.x.abs()).mul(smoothstep(quad.top, quad.top - 0.3, point.y)).mul(smoothstep(quad.bottom, quad.bottom + 0.25, point.y))
    const front = max(body, smoke.mul(float(1).sub(body)))
    const alpha = front.add(halo.mul(float(1).sub(front)))
    material.colorNode = surface.mul(body).add(smokeColor.mul(smoke).mul(float(1).sub(body))).add(glowColor.mul(1.8).mul(halo)).div(alpha.max(0.0001))
    material.opacityNode = alpha.mul(inside)
  }
}
