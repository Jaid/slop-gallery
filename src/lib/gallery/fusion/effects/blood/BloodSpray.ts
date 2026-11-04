import type {BloodDrop} from './flights.ts'

import {atan, attribute, cameraPosition, cross, exp, float, mix, modelPosition, mx_noise_float, positionGeometry, select, smoothstep, uv, vec2, vec3} from 'three/tsl'
import {PlaneGeometry} from 'three/webgpu'

import {coverage, rgb} from '#src/lib/materials/orb/fill.ts'

import {portalPoint} from '../base/billboards.ts'
import EffectSprites, {instanceAttribute} from '../base/EffectSprites.ts'
import {drying, gravity, splatLift} from './flights.ts'

/** how far a flying drop’s quad reaches to either side of its line, in its radii, with room for its outline’s antialiasing */
const margin = 1.25
/** how far a splat’s quad reaches from its middle, in its radii: ahead and behind along the drop’s flight, and to its sides */
const splatQuad = {
  ahead: 1.7,
  side: 1.45,
} as const
/** how far a drop smears out behind it as it flies, in meters for every m/s */
const smear = 0.028
const bloodColors = {
  clot: rgb('#4a0309'),
  dark: rgb('#6e0710'),
  thin: rgb('#b3121e'),
  shine: rgb('#ffd8d8'),
}

/**
 * Blood spurting out of a fusion’s portal: every drop flies as a teardrop smeared along its flight, turned toward the camera around it, rains down and splats flat on the floor where it lands, as `bloodLanding` has it, into a pool with a spiky rim splashed ahead, flecked with spatter, which dries away a few seconds later. Drips swell under the portal before they fall. Animated entirely on the GPU by the clock.
 */
export default class BloodSpray extends EffectSprites {
  constructor(drops: ReadonlyArray<BloodDrop>) {
    const geometry = new PlaneGeometry(1, 1)
    instanceAttribute(geometry, 'bloodTimes', drops.map(({delay, hang, phase, size}) => [delay, hang, size, phase]))
    instanceAttribute(geometry, 'bloodStart', drops.map(({start}) => start))
    instanceAttribute(geometry, 'bloodVelocity', drops.map(({velocity}) => velocity))
    super('fusion-blood', geometry, drops.length)
    const {material} = this
    const {clock, floor, normal, tangent} = this.uniforms
    const times = attribute<'vec4'>('bloodTimes', 'vec4')
    const start = attribute<'vec3'>('bloodStart', 'vec3')
    const velocity = attribute<'vec3'>('bloodVelocity', 'vec3')
    const [delay, hang, size, phase] = [times.x, times.y, times.z, times.w]
    const age = clock.sub(delay)
    const since = age.max(0)
    const shown = clock.greaterThan(delay.sub(hang))
    // A drip swells hanging from the portal before it drops.
    const swelling = select(hang.greaterThan(0), smoothstep(hang.negate(), 0, age).mul(0.7).add(0.3), float(1))
    const radius = size.mul(0.5).mul(swelling)
    const drop = start.y.sub(floor).sub(splatLift).max(0)
    const landing = velocity.y.add(velocity.y.mul(velocity.y).add(drop.mul(2 * gravity)).sqrt()).div(gravity)
    const flying = since.lessThan(landing)
    const at = (seconds: typeof since) => portalPoint(tangent, normal, start.x.add(velocity.x.mul(seconds)), start.y.add(velocity.y.mul(seconds)).sub(seconds.mul(seconds).mul(gravity / 2)), start.z.add(velocity.z.mul(seconds)))
    const fall = (seconds: typeof since) => portalPoint(tangent, normal, velocity.x, velocity.y.sub(seconds.mul(gravity)), velocity.z)
    // In flight: a teardrop from its head, where the drop is, smeared back along its flight.
    const head = at(since)
    const motion = fall(since)
    const along = motion.add(vec3(0, -0.001, 0)).normalize()
    const length = radius.mul(2).add(motion.length().mul(smear))
    const side = cross(cameraPosition.sub(modelPosition.add(head)), along).normalize()
    const middle = head.sub(along.mul(length.mul(0.5).sub(radius)))
    const streak = middle.add(along.mul(positionGeometry.y.mul(length))).add(side.mul(positionGeometry.x.mul(radius).mul(margin * 2)))
    // On the floor: a splat where it landed, the harder it hit the wider, splashed ahead along its flight.
    const ground = at(landing)
    const ahead = portalPoint(tangent, normal, velocity.x, 0, velocity.z)
    const forward = select(ahead.length().greaterThan(0.001), ahead.normalize(), normal)
    const across = cross(vec3(0, 1, 0), forward)
    const impact = fall(landing).length()
    const spread = size.mul(impact.mul(0.3).add(1.7)).mul(float(1).sub(exp(since.sub(landing).max(0).mul(-45))).mul(0.85).add(0.15))
    const splat = ground.add(forward.mul(positionGeometry.x.mul(splatQuad.ahead * 2).add(0.2).mul(spread))).add(across.mul(positionGeometry.y.mul(splatQuad.side * 2).mul(spread)))
    material.positionNode = select(shown, select(flying, streak, splat), vec3(0, 0, 0))
    // The teardrop, in meters: round at its head, tapering toward its tail, with a wet shine.
    const point = vec2(uv().x.sub(0.5).mul(radius).mul(margin * 2), uv().y.sub(0.5).mul(length))
    const tip = length.mul(0.5).sub(radius)
    const tail = length.mul(-0.5).add(radius.mul(0.35))
    const nearest = point.y.clamp(tail, tip)
    const thickness = mix(radius.mul(0.35), radius, nearest.sub(tail).div(tip.sub(tail).max(0.0001)))
    const teardrop = thickness.sub(vec2(point.x, point.y.sub(nearest)).length())
    const shine = exp(vec2(point.x.add(radius.mul(0.35)), point.y.sub(tip.sub(radius.mul(0.2)))).length().div(radius.mul(0.32).max(0.0001)).pow2().negate())
    const dropColor = mix(bloodColors.dark, bloodColors.thin, float(1).sub(point.x.abs().div(radius.max(0.0001))).clamp(0, 1)).add(bloodColors.shine.mul(shine).mul(0.6))
    // The splat, in its radii: a pool with a spiky rim, bulging ahead, and flecks of spatter around it, thickest ahead.
    const flat = vec2(uv().x.sub(0.5).mul(splatQuad.ahead * 2).sub(0.2), uv().y.sub(0.5).mul(splatQuad.side * 2))
    const angle = atan(flat.y, flat.x)
    const distance = vec2(flat.x.div(1.25), flat.y).length()
    const forwardness = angle.cos().max(0)
    const rim = mx_noise_float(vec3(angle.cos().mul(3.2), angle.sin().mul(3.2), phase.mul(10))).mul(0.2).add(forwardness.pow(4).mul(0.22)).add(0.62)
    const pool = rim.sub(distance)
    const flecking = smoothstep(0.65, 0.85, distance).mul(smoothstep(1.6, 1.15, distance)).mul(forwardness.mul(0.6).add(0.4))
    const spatter = mx_noise_float(vec3(flat.mul(4.5), phase.mul(17))).sub(mix(float(1), float(0.36), flecking)).mul(0.3)
    const splatInside = pool.max(spatter)
    // Thin and bright at its rim and in the spatter, thick and dark within, with a wet glint.
    const glint = exp(flat.sub(vec2(-0.2, 0.15)).dot(flat.sub(vec2(-0.2, 0.15))).mul(-30)).mul(smoothstep(0.05, 0.2, pool))
    const splatColor = mix(bloodColors.thin, bloodColors.dark, smoothstep(0.02, 0.3, pool)).add(bloodColors.shine.mul(glint).mul(0.06))
    const dryAt = phase.mul(drying.stagger).add(drying.start)
    const presence = select(shown, smoothstep(dryAt.add(drying.duration), dryAt, clock), float(0))
    material.colorNode = select(flying, dropColor, splatColor)
    material.opacityNode = coverage(select(flying, teardrop, splatInside)).mul(presence)
  }
}
