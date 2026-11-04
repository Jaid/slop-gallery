import type {FlungTreat} from './flights.ts'
import type {Node} from 'three/webgpu'

import {attribute, exp, float, mix, positionGeometry, select, sin, smoothstep, uv, vec2, vec3} from 'three/tsl'
import {Color, PlaneGeometry} from 'three/webgpu'

import {coverage, rgb} from '#src/lib/materials/orb/fill.ts'

import {portalPoint, screenAxes} from '../base/billboards.ts'
import EffectSprites, {instanceAttribute} from '../base/EffectSprites.ts'
import {bounce, fading, flutter, gravity, treatKinds} from './flights.ts'

/** how far a treat’s quad reaches from its middle, in its own units, half its length each, with room for its outline’s antialiasing */
const reach = 1.1
/** seconds a treat takes to grow to its size once it is out */
const growing = 0.12
const cornColors = {
  tip: rgb('#fff4dc'),
  middle: rgb('#ff7a00'),
  base: rgb('#ffc21a'),
}
/** an ellipse’s inside, positive within it, about in units of its smaller radius */
function ellipse(point: Node<'vec2'>, radii: readonly [number, number]) {
  return float(1).sub(point.div(vec2(...radii)).length()).mul(Math.min(...radii))
}
/** A wrapped candy, in its own units, which run from −1 to 1 along it: a round sweet with stripes running across it and its wrapper twisted shut on both sides, fanning out into crinkled ends. */
function wrappedCandy(point: Node<'vec2'>, color: Node<'vec3'>) {
  const {x, y} = point
  const side = x.abs()
  const sweet = ellipse(point, [0.42, 0.33])
  const fan = side.sub(0.42).max(0).mul(0.62).add(0.06)
  const edge = float(0.95).sub(sin(y.mul(30)).abs().mul(0.06))
  const wrapper = fan.sub(y.abs()).min(edge.sub(side)).min(side.sub(0.36))
  const stripes = smoothstep(0.2, 0.5, sin(x.mul(0.8).add(y).mul(15)))
  const pleats = sin(y.div(side.sub(0.38).max(0.04)).mul(5)).mul(0.5).add(0.5)
  const shine = exp(point.sub(vec2(-0.13, 0.13)).dot(point.sub(vec2(-0.13, 0.13))).mul(-40))
  const rounded = float(1).sub(point.div(vec2(0.42, 0.33)).length().pow(3).mul(0.45))
  const sweetColor = mix(color, mix(color, vec3(1), 0.45), stripes).mul(rounded).add(shine.mul(0.7))
  const wrapperColor = mix(color, vec3(1), 0.15).mul(pleats.mul(0.35).add(0.65))
  const covered = coverage(sweet)
  return {
    inside: sweet.max(wrapper),
    color: mix(wrapperColor, sweetColor, covered),
  }
}
/** A kernel of candy corn, in its own units, which run from −1 to 1 along it: a rounded wedge pointing up, white at its tip, orange in the middle and yellow at its base. */
function candyCorn(point: Node<'vec2'>) {
  const {x, y} = point
  const width = float(0.85).sub(y).mul(0.55 / 1.5)
  const base = y.add(0.65).sub(x.mul(x).mul(0.4))
  const inside = width.sub(x.abs()).min(base).min(float(0.85).sub(y))
  const band = (at: number) => smoothstep(at - 0.03, at + 0.03, y)
  const color = mix(mix(cornColors.base, cornColors.middle, band(-0.2)), cornColors.tip, band(0.3))
  const shade = smoothstep(-0.5, 0.4, x.div(width.max(0.05))).mul(-0.35).add(1.1)
  return {
    inside,
    color: color.mul(shade),
  }
}
/** A scrap of confetti, in its own units, which run from −1 to 1 along it. */
function confetti(point: Node<'vec2'>, color: Node<'vec3'>) {
  return {
    inside: float(0.8).sub(point.x.abs()).min(float(0.38).sub(point.y.abs())),
    color,
  }
}

/**
 * Halloween treats flung out of a fusion’s portal like out of a party popper: wrapped candies and candy corn tumbling through the air, which bounce once on the floor and come to rest there, and confetti fluttering down slowly, until they all fade away. Animated entirely on the GPU by the clock, each a quad flat in the view, turning in it and narrowing and widening as it turns over.
 */
export default class CandyBurst extends EffectSprites {
  constructor(treats: ReadonlyArray<FlungTreat>) {
    const geometry = new PlaneGeometry(1, 1)
    instanceAttribute(geometry, 'treatFlight', treats.map(({delay, flip, phase, spin}) => [delay, spin, flip, phase]))
    instanceAttribute(geometry, 'treatVelocity', treats.map(({kind, velocity}) => [...velocity, treatKinds.indexOf(kind)]))
    instanceAttribute(geometry, 'treatLook', treats.map(({color, size}) => [...new Color(color), size]))
    super('fusion-candy', geometry, treats.length)
    const {material} = this
    const {clock, floor, normal, tangent} = this.uniforms
    const flight = attribute<'vec4'>('treatFlight', 'vec4')
    const launch = attribute<'vec4'>('treatVelocity', 'vec4')
    const look = attribute<'vec4'>('treatLook', 'vec4')
    const [delay, spin, flip, phase] = [flight.x, flight.y, flight.z, flight.w]
    const [along, up, out, kind] = [launch.x, launch.y, launch.z, launch.w]
    const [color, size] = [look.xyz, look.w]
    const isCorn = kind.greaterThan(0.5).and(kind.lessThan(1.5))
    const isConfetti = kind.greaterThan(1.5)
    const age = clock.sub(delay)
    const since = age.max(0)
    // A candy flies until it lands, as `candyLanding` has it, hops once and lies still.
    const resting = select(isConfetti, float(0.01), size.mul(0.3))
    const drop = floor.add(resting).negate().max(0)
    const landing = up.add(up.mul(up).add(drop.mul(2 * gravity)).sqrt()).div(gravity)
    const rebound = landing.mul(gravity).sub(up).mul(bounce.up)
    const hop = rebound.mul(2 / gravity)
    const flying = since.min(landing)
    const hopping = since.sub(landing).clamp(0, hop)
    const candyHeight = select(since.lessThan(landing), up.mul(since).sub(since.mul(since).mul(gravity / 2)), floor.add(resting).add(rebound.mul(hopping)).sub(hopping.mul(hopping).mul(gravity / 2)))
    const candyTravel = flying.add(hopping.mul(bounce.along))
    // Confetti loses its speed to the air at once and flutters down, swaying, until it lies on the floor.
    const slowing = float(1).sub(exp(since.mul(-flutter.drag)))
    const confettiHeight = up.add(flutter.fall).div(flutter.drag).mul(slowing).sub(since.mul(flutter.fall)).max(floor.add(resting))
    const sway = sin(since.mul(3).add(phase.mul(Math.PI * 2))).mul(slowing).mul(0.12)
    const travel = select(isConfetti, slowing.div(flutter.drag), candyTravel)
    const center = portalPoint(tangent, normal, along.mul(travel).add(select(isConfetti, sway, float(0))), select(isConfetti, confettiHeight, candyHeight), out.mul(travel))
    const turning = select(isConfetti, since, flying.add(hopping.mul(0.4)))
    const turnedOver = flip.mul(turning).add(phase.mul(Math.PI * 2))
    const facing = turnedOver.cos()
    const {right, up: upward} = screenAxes(spin.mul(turning))
    const unit = size.mul(0.5).mul(smoothstep(0, growing, since).mul(0.6).add(0.4))
    const placed = center.add(right.mul(positionGeometry.x.mul(reach * 2).mul(unit).mul(facing.abs().max(0.12)))).add(upward.mul(positionGeometry.y.mul(reach * 2).mul(unit)))
    material.positionNode = select(age.greaterThan(0), placed, vec3(0, 0, 0))
    const point = uv().sub(0.5).mul(reach * 2)
    const wrapped = wrappedCandy(point, color)
    const corn = candyCorn(point)
    const scrap = confetti(point, color)
    const inside = select(isConfetti, scrap.inside, select(isCorn, corn.inside, wrapped.inside))
    // Confetti shows its paler back as it turns over; foil flashes as it turns to face the light.
    const back = select(isConfetti.and(facing.lessThan(0)), float(0.6), float(1))
    const flash = facing.abs().pow(24).mul(select(isCorn, float(0), float(0.45)))
    const shade = select(isConfetti, scrap.color, select(isCorn, corn.color, wrapped.color)).mul(back).add(flash)
    const fadeStart = phase.mul(fading.stagger).add(fading.start)
    const presence = select(age.greaterThan(0), smoothstep(0, 0.04, age).mul(smoothstep(fadeStart.add(fading.duration), fadeStart, clock)), float(0))
    material.colorNode = shade
    material.opacityNode = coverage(inside).mul(presence)
  }
}
