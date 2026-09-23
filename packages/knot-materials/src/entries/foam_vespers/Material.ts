import type {Node, Texture} from 'three/webgpu'

import {color, float, Fn, If, Loop, mix, mx_noise_float, normalViewGeometry, positionViewDirection, time, transformNormalToView, uv, varying, vec2, vec3} from 'three/tsl'

import {detailNormal} from '../../candidates/deepseek/lib/detailNormal.ts'
import {cellNoiseVec3} from '../../lib/cellNoiseVec3.ts'
import {filament} from '../../lib/filament.ts'
import {knotFrame} from '../../lib/knotFrame.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {TAU} from '../../lib/TAU.ts'
import knotData from './data.ts'

/**
 * The two nearest jittered lattice sites around a point, found among the eight cells that share a corner instead of the usual twenty-seven. Enough for foam, where every bubble keeps its site near home, and twice as cheap as the general Voronoi search.
 */
function foamCells(position: Node<'vec3'>, jitter = 0.62) {
  const base = position.floor()
  const local = position.fract()
  const first = float(1e6).toVar('foamFirst')
  const second = float(1e6).toVar('foamSecond')
  const nearest = vec3(0).toVar('foamNearest')
  Loop(8, ({i}) => {
    const offset = vec3(float(i.mod(2)), float(i.div(2).mod(2)), float(i.div(4)))
    const site = cellNoiseVec3(base.add(offset)).mul(jitter).add(0.5)
    const distance = offset.add(site).sub(local).length()
    If(distance.lessThan(first), () => {
      second.assign(first)
      first.assign(distance)
      nearest.assign(offset)
    }).ElseIf(distance.lessThan(second), () => {
      second.assign(distance)
    })
  })
  return {first, second, identity: cellNoiseVec3(base.add(nearest)),
// Distance to the shared film between two bubbles: zero on the wall, largest at the dome.
    wall: second.sub(first)}
}
const foamScale = 6.5
const reliefAmplitude = 0.015
/**
 * The foam lattice lives in stretched tube space, so the outer surface can be evaluated from a uv pair.
 */
const toFoamSpace = (coordinate: Node<'vec2'>) => knotFrame(coordinate).position.mul(foamScale)
/**
 * Trim a field’s extremes so shimmering detail never saturates into a flat mask.
 */
const contrast = (value: Node<'float'>) => value.sub(0.5).abs().mul(2)
/**
 * A froth of soap films growing on the knot. Every bubble carries its own film thickness and its own slow drain, so the interference colours walk down each dome and run to black just before the film rears up again. Where two bubbles meet, the soap gathers into a crease, and the crest of the film carries a rainbow that the eye can follow around the whole knot.
 */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.55)
    this.name = knotData.id
    const tube = uv()
/**
 * Dome height of the foam above the tube surface, in object units.
 */
    const relief = Fn(([coordinate]: [Node<'vec2'>]) => {
      const {position, normal} = knotFrame(coordinate)
      const {first, identity} = foamCells(toFoamSpace(coordinate))
      const radius = identity.z.mul(0.14).add(0.44)
      const dome = radius.mul(radius).sub(first.mul(first)).max(0).sqrt().div(radius)
      const breath = time.mul(0.22).add(identity.y.mul(24)).sin().mul(0.16).add(0.94)
      return position.add(normal.mul(dome.mul(reliefAmplitude).mul(breath)))
    })
    this.positionNode = relief(tube)
    const epsilon = 0.0004
    const du = relief(tube.add(vec2(epsilon, 0))).sub(relief(tube.sub(vec2(epsilon, 0))))
    const dv = relief(tube.add(vec2(0, epsilon))).sub(relief(tube.sub(vec2(0, epsilon))))
    const reliefNormal = varying(transformNormalToView(du.cross(dv).normalize())).normalize()
    const {first, identity, wall} = foamCells(toFoamSpace(tube))
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const footprint = first.fwidth()
    const resolved = footprint.smoothstep(0.25, 0.9).oneMinus()
// Plateau borders: where two films meet, the soap gathers into a thick bright crease.
    const crease = wall.mul(foamScale).smoothstep(0.34, 0.02)
// Stretched thin over the crown of a dome, and drained of soap, a film goes matte and almost black.
    const crown = first.div(identity.z.mul(0.14).add(0.44)).min(1)
// A stretched dome is thinnest at its crown and keeps thinning until the film has drained away.
    const drain = time.mul(0.13).add(identity.x.mul(3.7)).fract()
    const thickness = float(0.78).sub(drain.mul(0.62)).mul(crease.mul(0.82).add(0.18))
// Interference of light that crossed a film of n = 1.33 twice, in nanometres.
    const path = thickness.mul(2.66).mul(facing.pow(0.3)).mul(540)
    const fringe = path.mul(vec3(1 / 680, 1 / 550, 1 / 450)).mul(TAU).cos().mul(0.5).add(0.5)
    const blackFilm = thickness.smoothstep(0.07, 0.24)
// Push the interference colours away from gray: soap films are far more saturated than a cosine.
    const vivid = mix(vec3(fringe.dot(vec3(0.2126, 0.7152, 0.0722))), fringe, 1.75).clamp(0, 1)
    const rainbow = vivid.mul(blackFilm).mul(resolved.mul(0.85).add(0.15))
// Marangoni ripples and the microscopic froth that clings to the walls, both only visible up close.
    const ripple = filament(mx_noise_float(vec3(tube.x.mul(70), tube.y.mul(50), wall.mul(-9))).mul(1.5), 0.07)
    const froth = mx_noise_float(vec3(tube.x.mul(300), tube.y.mul(170), 0)).mul(0.5).add(0.5).smoothstep(0.58, 0.86)
    const sparkle = froth.mul(filament(mx_noise_float(vec3(tube.x.mul(520), tube.y.mul(310), 0)).mul(2), 0.12))
    this.colorNode = mix(color('#040608'), color('#0e161c'), blackFilm).mul(crown.pow(2).mul(-0.6).add(1))
      .add(rainbow.mul(0.02))
      .add(color('#dfe8ee').mul(crease).mul(0.03))
      .add(rainbow.mul(ripple).mul(0.012))
    this.metalness = 0
    this.roughnessNode = float(0.035).add(contrast(ripple).mul(0.1)).add(froth.mul(0.18)).add(crown.pow(3).mul(0.45)).clamp(0.02, 1)
    this.clearcoat = 1
    this.clearcoatRoughnessNode = float(0.03).add(froth.mul(0.05))
    this.ior = 1.33
    this.normalNode = detailNormal(reliefNormal, ripple.mul(0.0007).add(froth.mul(0.0005)), 0.35)
    this.emissiveNode = rainbow.mul(0.1)
      .add(rainbow.mul(ripple).mul(0.06))
      .add(color('#e8f2f8').mul(crease).mul(0.03))
      .add(color('#cfe8ff').mul(sparkle).mul(0.12))
      .add(rainbow.mul(froth).mul(0.08))
  }
}
