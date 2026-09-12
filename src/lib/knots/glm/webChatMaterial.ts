import type {Node, Texture} from 'three/webgpu'

import * as tsl from 'three/tsl'
import {cameraPosition, color, float, Fn, mix, modelWorldMatrixInverse, mx_atan2, mx_cell_noise_float, mx_fractal_noise_float, mx_noise_float, negateOnBackSide, normalViewGeometry, positionGeometry, positionView, positionViewDirection, reflectVector, time, transformNormalToView, uv, varying, vec2, vec3, vec4} from 'three/tsl'
import {MeshPhysicalNodeMaterial} from 'three/webgpu'

/**
 * KnotMaterialPremium — the second wing of the Infinity Knot collection.
 *
 * Every finish answers two questions the visitor asks with their feet:
 * "what happens when I circle it?" and "what happens when I step closer?"
 */

export function spectralColor(phase: Node<'float'>) {
  return vec3(phase, phase.add(2.0944), phase.add(4.1888)).cos().mul(0.46).add(0.54)
}

export function opticalLine(field: Node<'float'>, width: number) {
  const footprint = field.fwidth().max(0.0001)
  return field.abs().smoothstep(width, footprint.mul(1.25).add(width)).oneMinus()
}

export function opticalBands(phase: Node<'float'>) {
  const visibility = phase.fwidth().smoothstep(0.6, 3).oneMinus()
  return phase.cos().mul(visibility).mul(0.5).add(0.5)
}

export function proceduralNormal(height: Node<'float'>, strength: number) {
  const dx = positionView.dFdx()
  const dy = positionView.dFdy()
  const normal = normalViewGeometry
  const rx = dy.cross(normal)
  const ry = normal.cross(dx)
  const determinant = dx.dot(rx)
  const gradient = rx.mul(height.dFdx()).add(ry.mul(height.dFdy())).mul(determinant.sign()).div(determinant.abs().max(1e-12))
  return negateOnBackSide(normal.sub(gradient.mul(strength)).normalize())
}

export function viewerFrame() {
  const p = positionGeometry
  const cameraLocal = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz
  const view = cameraLocal.sub(p).normalize()
  const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
  const grazing = facing.oneMinus()
  const distance = positionView.length()
  return {
    p,
    cameraLocal,
    view,
    facing,
    grazing,
    rim: grazing.abs().pow(2),
    distance,
    near: distance.smoothstep(1.25, 5.5).oneMinus(),
    intimate: distance.smoothstep(0.8, 2.7).oneMinus(),
  }
}

export const cellNoiseVec3 = (tsl as typeof tsl & {
  mx_cell_noise_vec3: (position: Node<'vec3'>) => Node<'vec3'>
}).mx_cell_noise_vec3

export function glints(normal: Node<'vec3'>, sharpness: number) {
  const lamps = [vec3(0.35, 0.78, 0.52), vec3(-0.62, 0.28, 0.73), vec3(0.1, -0.35, 0.93)]
  let sum: Node<'float'> = float(0)
  for (const lamp of lamps) {
    const half = lamp.normalize().add(positionViewDirection).normalize()
    sum = sum.add(normal.dot(half).clamp().pow(sharpness))
  }
  return sum
}

/** Shortest signed-free distance from x to the nearest integer, in [0, 0.5]. */
export function wrap01(x: Node<'float'>) {
  return x.fract().sub(0.5).abs().oneMinus()
}

const knotCurve = Fn(([
  angle]: [
  Node<'float'>,
]) => {
  const phase = angle.mul(1.5)
  const radius = phase.cos().add(2).mul(0.225)
  return vec3(radius.mul(angle.cos()), radius.mul(angle.sin()), phase.sin().mul(0.225))
})
/** Hopper-crystal staircase field: growth rings around the tube, quantised into terraces. */
function hopperFields(tube: Node<'vec2'>) {
  const levels = 7
  const wobble = tube.x.mul(Math.PI * 2 * 3).sin().mul(1.5)
  const ring = tube.y.mul(Math.PI * 2 * 3).add(wobble).sin().mul(0.5).add(0.5)
  const stepped = ring.mul(levels)
  const terrace = stepped.floor()
  const inTerrace = stepped.fract()
  const riser = inTerrace.smoothstep(0.78, 1)
  const staircase = terrace.add(riser).div(levels)
  return {
    staircase,
    terrace,
    riser,
    inTerrace,
  }
}
const hopperPosition = Fn(([
  tube]: [
  Node<'vec2'>,
]) => {
  const angle = tube.x.mul(Math.PI * 4)
  const center = knotCurve(angle)
  const next = knotCurve(angle.add(0.01))
  const tangent = next.sub(center)
  const binormal = tangent.cross(next.add(center)).normalize()
  const frameNormal = binormal.cross(tangent).normalize()
  const around = tube.y.mul(Math.PI * 2)
  const radial = frameNormal.mul(around.cos().negate()).add(binormal.mul(around.sin()))
  const {staircase} = hopperFields(tube)
  const lift = staircase.sub(0.5).mul(0.07).add(mx_noise_float(positionGeometry.mul(5)).mul(0.006)).add(0.13)
  return center.add(radial.mul(lift))
})
/** A brass gear wheel living on a horizontal slab of local space; returns its brightness. */
function brassGear(q: Node<'vec3'>, offsetY: number, outer: number, teeth: number, rotation: Node<'float'>) {
  const theta = mx_atan2(q.z, q.x) as Node<'float'>
  const radius = vec2(q.x, q.z).length()
  const dY = q.y.sub(offsetY)
  const plate = dY.mul(dY).mul(-2600).exp()
  const dR = radius.sub(outer)
  const rim = dR.mul(dR).mul(-320).exp()
  const toothRing = opticalLine(theta.mul(teeth).add(rotation).sin(), 0.3)
  const toothed = rim.mul(toothRing.mul(0.85).add(0.15))
  const spokes = opticalLine(theta.mul(5).add(rotation).sin(), 0.22)
    .mul(radius.smoothstep(outer * 0.12, outer * 0.4))
    .mul(radius.smoothstep(outer, outer * 1.15).oneMinus())
  const dH = radius.sub(outer * 0.16)
  const hub = dH.mul(dH).mul(-2400).exp()
  return plate.mul(toothed.add(spokes.mul(0.9)).add(hub.mul(1.6))).clamp()
}

export const knotFinishesPremium = [
  {
    id: 'bismuth_pagoda',
    title: 'Bismuth Pagoda',
    accent: '#ff9de2',
  },
  {
    id: 'obsidian_rift',
    title: 'Obsidian Rift',
    accent: '#ff5a1f',
  },
  {
    id: 'polar_nocturne',
    title: 'Polar Nocturne',
    accent: '#54ff9e',
  },
  {
    id: 'caged_star',
    title: 'Caged Star',
    accent: '#ffb347',
  },
  {
    id: 'interference_shrine',
    title: 'Interference Shrine',
    accent: '#5ac8ff',
  },
  {
    id: 'abyssal_choir',
    title: 'Abyssal Choir',
    accent: '#38d6ff',
  },
  {
    id: 'clockwork_heart',
    title: 'Clockwork Heart',
    accent: '#e0a93e',
  },
  {
    id: 'storm_vessel',
    title: 'Storm Vessel',
    accent: '#8a7bff',
  },
] as const

export type KnotFinishPremium = typeof knotFinishesPremium[number]['id']

export class KnotMaterialPremium extends MeshPhysicalNodeMaterial {
  constructor(finish: KnotFinishPremium, environment: Texture) {
    super({
      envMap: environment,
      envMapIntensity: 0.9,
    })
    this.name = finish
    switch (finish) {
      case 'bismuth_pagoda': {
                // Hopper-grown crystal terraces; the oxide rainbow re-tunes as the eye circles it.
        const tube = uv()
        this.positionNode = hopperPosition(tube)
        const epsilon = 0.0002
        const du = hopperPosition(tube.add(vec2(epsilon, 0))).sub(hopperPosition(tube.sub(vec2(epsilon, 0))))
        const dv = hopperPosition(tube.add(vec2(0, epsilon))).sub(hopperPosition(tube.sub(vec2(0, epsilon))))
        const normal = varying(transformNormalToView(du.cross(dv).normalize())).normalize()
        this.normalNode = negateOnBackSide(normal)
        this.clearcoatNormalNode = this.normalNode
        const {terrace, riser, inTerrace} = hopperFields(tube)
        const {view, grazing, near} = viewerFrame()
        const level = terrace.div(7)
        const hue = level.mul(1.2).add(view.x.mul(0.55)).add(view.z.mul(0.45)).add(time.mul(0.02))
        const oxide = spectralColor(hue)
        const lip = opticalLine(inTerrace.oneMinus(), 0.12)
        this.colorNode = oxide.mul(riser.mul(0.25).add(0.75)).mul(0.92)
        this.metalness = 0.9
        this.roughnessNode = riser.mul(0.14).add(0.12)
        this.clearcoat = 0.65
        this.clearcoatRoughness = 0.08
        this.iridescence = 0.5
        this.iridescenceIOR = 1.4
        this.iridescenceThicknessNode = level.mul(280).add(220)
        this.emissiveNode = spectralColor(hue.add(2.4)).mul(lip.mul(0.85).add(riser.pow(2).mul(0.12))).mul(near.mul(0.55).add(0.45)).add(oxide.mul(glints(normalViewGeometry, 130)).mul(near).mul(0.3)).add(color('#6a5bff').mul(grazing.pow(3)).mul(0.25))
        break
      }
      case 'obsidian_rift': {
                // Volcanic glass over a live magma web; the rifts breathe harder when you lean in.
        const {p, view, facing, grazing, near, intimate} = viewerFrame()
        const deep = p.sub(view.mul(0.07))
        const drift = vec3(time.mul(0.055), time.mul(-0.04), time.mul(0.03))
        const coarse = mx_noise_float(deep.mul(2.4).add(drift))
        const fine = mx_noise_float(deep.mul(6.8).sub(drift.mul(1.6)).add(coarse.mul(0.9)))
        const crackField = fine.add(coarse.mul(0.5))
        const crack = opticalLine(crackField, 0.045)
        const core = opticalLine(crackField, 0.012)
        const halo = crackField.abs().smoothstep(0.03, 0.34).oneMinus()
        const micro = opticalLine(mx_noise_float(deep.mul(15)).add(crackField.mul(0.25)), 0.02).mul(intimate)
        const vein = time.mul(0.9).add(p.y.mul(6)).sin().mul(0.3).add(0.85)
        const breath = time.mul(0.4).sin().mul(0.15).add(0.85)
        const heat = near.mul(0.5).add(intimate.mul(0.6)).add(0.35).mul(breath)
        const chambers = mx_fractal_noise_float(p.mul(1.6), 2, 2, 0.5).smoothstep(0.3, 0.75)
        const ember = mix(color('#ff6a13'), color('#ffe3ae'), core.add(crack.mul(0.35)).clamp())
        this.colorNode = mix(color('#0b0806'), color('#33100a'), grazing.pow(2).mul(0.75))
        this.metalness = 0.15
        this.roughnessNode = crack.mul(0.3).add(chambers.mul(0.05)).add(0.05)
        this.clearcoat = 1
        this.clearcoatRoughness = 0.04
        this.normalNode = proceduralNormal(crackField.abs().smoothstep(0, 0.22), 0.003)
        this.emissiveNode = ember.mul(crack.mul(1.7).mul(vein).add(halo.mul(0.38)).add(micro.mul(0.9))).mul(heat).mul(facing.mul(0.35).add(0.75)).add(color('#7a1a05').mul(chambers).mul(grazing.pow(1.5)).mul(0.55)).add(color('#ff5722').mul(grazing.pow(4)).mul(0.2))
        break
      }
      case 'polar_nocturne': {
                // Aurora curtains in silk; like the true night sky, they burn brightest seen edge-on.
        const {p, view, grazing, near, intimate} = viewerFrame()
        const fold = vec3(0.94, 0, 0.34)
        const edgeOn = view.dot(fold).abs().oneMinus().clamp().pow(1.5)
        const density = edgeOn.mul(1.5).add(0.3)
        const sway = p.y.mul(3.4).add(time.mul(0.55)).sin().mul(1.1).add(mx_noise_float(vec3(p.x.mul(0.7), time.mul(0.12), p.z.mul(0.7))).mul(2.6))
        const phase = p.dot(fold).mul(13).add(sway)
        const primary = opticalLine(phase.sin(), 0.5)
        const secondary = opticalLine(phase.add(2.2).sin(), 0.2)
        const rayPhase = p.dot(vec3(-0.34, 0, 0.94)).mul(46).add(time.mul(1.4))
        const rays = opticalLine(rayPhase.sin(), 0.34).mul(time.mul(2.6).add(p.y.mul(9)).sin().mul(0.35).add(0.65))
        const alt = p.y.mul(1.3).add(0.5).clamp()
        const curtain = mix(color('#27ff8f'), color('#7d4dff'), alt)
        const fringe = mix(curtain, color('#ff4f9e'), alt.pow(5).mul(0.7))
        const breathe = time.mul(0.2).sin().mul(0.25).add(0.75)
        this.colorNode = mix(color('#040812'), color('#0a1b2e'), alt.mul(0.5))
        this.metalness = 0.45
        this.roughnessNode = primary.mul(0.1).add(0.32)
        this.anisotropy = 0.85
        this.iridescence = 0.35
        this.iridescenceIOR = 1.5
        this.iridescenceThicknessNode = alt.mul(340).add(260)
        this.clearcoat = 0.4
        this.clearcoatRoughness = 0.2
        this.emissiveNode = fringe.mul(primary.mul(1.5).add(secondary.mul(0.6)).mul(density)).mul(rays.add(0.35)).mul(breathe).mul(near.mul(0.6).add(0.4)).add(color('#6fe3ff').mul(grazing.pow(2)).mul(0.3)).add(fringe.mul(intimate).mul(0.15))
        break
      }
      case 'caged_star': {
                // A stowaway star: boiling granulation, drifting sunspots, and rim-fire at the limb.
        this.envMapIntensity = 0.25
        const {p, facing, grazing, near, intimate} = viewerFrame()
        const qA = p.mul(17).add(vec3(0, time.mul(0.22), time.mul(-0.09)))
        const rndA = cellNoiseVec3(qA)
        const domeA = qA.fract().sub(rndA.mul(0.6).add(0.2)).length().smoothstep(0.16, 0.6).oneMinus().mul(rndA.y.mul(0.5).add(0.75))
        const qB = p.mul(11).add(vec3(time.mul(-0.06), 0, time.mul(0.13)))
        const rndB = cellNoiseVec3(qB)
        const domeB = qB.fract().sub(rndB.mul(0.6).add(0.2)).length().smoothstep(0.2, 0.66).oneMinus()
        const gran = domeA.mul(0.62).add(domeB.mul(0.38))
        const spotField = mx_fractal_noise_float(p.mul(2.1), 2, 2, 0.5)
        const umbra = spotField.negate().smoothstep(0.42, 0.72)
        const penumbra = spotField.negate().smoothstep(0.14, 0.45)
        const cooled = umbra.mul(0.8).add(penumbra.mul(0.3))
        const temp = facing.mul(0.62).add(gran.mul(0.38)).sub(cooled).clamp()
        const disk = mix(mix(color('#a02c00'), color('#ffb347'), temp), color('#fff6d8'), temp.pow(3))
        const flameNoise = mx_noise_float(vec3(p.x.mul(4), p.y.mul(4).sub(time.mul(1.5)), p.z.mul(4)))
        const flames = flameNoise.smoothstep(0.2, 0.7).mul(grazing.pow(2.2))
        const flameColor = mix(color('#ff3400'), color('#ffc46b'), flameNoise.smoothstep(0.3, 0.8))
        const flareTick = time.mul(0.23).floor()
        const flare = mx_cell_noise_float(vec3(flareTick, 4.7, 9.2)).smoothstep(0.68, 0.9).mul(time.mul(0.23).fract().mul(-3).exp())
        const surface = gran.mul(0.5).add(0.7).mul(cooled.oneMinus().clamp())
        this.colorNode = color('#1c0800')
        this.metalness = 0
        this.roughness = 0.55
        this.clearcoat = 0.2
        this.clearcoatRoughness = 0.4
        this.normalNode = proceduralNormal(gran, 0.002)
        this.emissiveNode = disk.mul(surface).mul(1.9).mul(flare.mul(0.8).add(1)).mul(near.mul(0.25).add(0.85)).add(flameColor.mul(flames).mul(intimate.mul(0.9).add(0.9)).mul(1.5)).add(color('#ff2d00').mul(grazing.pow(3)).mul(0.8)).add(color('#ffb36b').mul(grazing.pow(4)).mul(near.oneMinus().mul(0.5).add(0.4)).mul(0.5))
        break
      }
      case 'interference_shrine': {
                // A diffraction shrine: every orbit sweeps a new rainbow across its face,
                // and the inner lattice collapses into rings whenever it is "measured".
        const {p, view, facing, grazing, near, intimate} = viewerFrame()
        const tube = uv()
        const reflLocal = modelWorldMatrixInverse.mul(vec4(reflectVector, 0)).xyz
        const hue = reflLocal.x.mul(6.5).add(reflLocal.z.mul(4.5)).add(reflLocal.y.mul(3))
        const diffraction = spectralColor(hue)
        const order2 = spectralColor(hue.mul(1.35).add(1.1))
        const grooves = opticalBands(tube.y.mul(Math.PI * 2 * 18))
        const tick = time.mul(0.8).floor()
        const measure = mx_cell_noise_float(vec3(tick, 6.6, 2.2)).smoothstep(0.42, 0.72)
        const frac = time.mul(0.8).fract()
        const emitter = p.sub(view.mul(0.16))
        const ringPhase = emitter.length().mul(36).sub(frac.mul(9))
        const packet = frac.smoothstep(0.02, 0.18).mul(frac.smoothstep(0.55, 0.98))
        const rings = opticalLine(ringPhase.sin(), 0.22).mul(packet)
        const flash = measure.mul(frac.mul(-9).exp())
        const latticeQ = p.mul(9.5)
        const lrnd = cellNoiseVec3(latticeQ)
        const dots = latticeQ.fract().sub(lrnd.mul(0.5).add(0.25)).length().smoothstep(0.08, 0.45).oneMinus()
        const shimmer = time.mul(2.5).add(lrnd.x.mul(19)).sin().mul(0.5).add(0.5)
        this.colorNode = mix(mix(color('#0a0c15'), diffraction, 0.7), order2, grooves.mul(0.35))
        this.metalness = 1
        this.roughnessNode = grooves.mul(0.05).add(0.09)
        this.anisotropy = 0.6
        this.iridescence = 0.8
        this.iridescenceIOR = 1.6
        this.iridescenceThicknessNode = facing.mul(380).add(140)
        this.clearcoat = 0.5
        this.clearcoatRoughness = 0.1
        this.emissiveNode = color('#7fe0ff').mul(rings).mul(measure).mul(2.2).mul(near.mul(0.5).add(intimate.mul(0.3)).add(0.35)).add(mix(color('#9fe8ff'), color('#eaffff'), lrnd.y).mul(dots).mul(shimmer).mul(0.55).mul(near.mul(0.7).add(0.3))).add(diffraction.mul(flash).mul(1.4)).add(spectralColor(hue.mul(0.6).add(facing.mul(3))).mul(grazing.pow(2.5)).mul(0.55)).add(diffraction.mul(glints(normalViewGeometry, 180)).mul(near).mul(0.45))
        break
      }
      case 'abyssal_choir': {
                // A deep-sea choir: rows of photophores ignite in a travelling cascade
                // when something draws near, and a lone lure wanders the skin forever.
        const {p, grazing, near, intimate} = viewerFrame()
        const tube = uv()
        const ribs = tube.x.mul(Math.PI * 2 * 34).sin().mul(0.5).add(0.5)
        const rows = opticalLine(tube.y.mul(Math.PI * 2 * 5).sin(), 0.2)
        const sites = opticalLine(tube.x.mul(Math.PI * 2 * 46).sin(), 0.3)
        const photophores = rows.mul(sites)
        const organRnd = cellNoiseVec3(p.mul(7)).x
        const organTint = mix(color('#48d9ff'), color('#b2fff0'), organRnd)
        const front = tube.x.sub(time.mul(0.16)).fract()
        const flash = front.smoothstep(0.05, 0.42).oneMinus()
        const excite = time.mul(16).add(tube.x.mul(Math.PI * 2 * 46)).sin().mul(0.5).add(0.5)
        const breath = time.mul(0.7).sin().mul(0.25).add(0.75)
        const lureD2 = wrap01(tube.x.sub(time.mul(0.085).fract())).mul(6).pow(2).add(wrap01(tube.y.sub(time.mul(0.31).fract())).pow(2))
        const lure = lureD2.mul(-60).exp()
        const mottle = mx_noise_float(p.mul(3)).mul(0.5).add(0.5)
        this.colorNode = mix(mix(color('#04060b'), color('#122031'), mottle.mul(0.6).add(ribs.mul(0.25))), color('#0d3540'), grazing.pow(2).mul(0.5))
        this.metalness = 0.05
        this.roughnessNode = ribs.mul(0.12).add(0.46)
        this.clearcoat = 0.85
        this.clearcoatRoughness = 0.28
        this.normalNode = proceduralNormal(ribs, 0.0016)
        this.emissiveNode = organTint.mul(photophores.mul(breath.mul(0.25).add(flash.mul(2.4).mul(near)).add(intimate.mul(excite).mul(0.6)))).add(organTint.mul(rows).mul(0.08)).add(mix(color('#3fb9ff'), color('#e6fbff'), lure).mul(lure).mul(3.2)).add(color('#2a6bff').mul(grazing.pow(2)).mul(0.22))
        break
      }
      case 'clockwork_heart': {
                // A heart of brass behind smoked glass: counter-turning wheels on two parallax
                // planes, a gold mainspring coiled around the shell, an escapement that ticks.
        const {p, view, facing, near} = viewerFrame()
        const tube = uv()
        const qNear = p.sub(view.mul(0.05))
        const qFar = p.sub(view.mul(0.12))
        const rotA = time.mul(1.1)
        const rotB = time.mul(-0.7)
        const rotC = time.mul(3).floor().div(3).mul(0.42)
        const gearA = brassGear(qFar, 0.17, 0.36, 14, rotA)
        const gearB = brassGear(qNear, -0.14, 0.48, 22, rotB)
        const gearC = brassGear(qNear, 0, 0.26, 10, rotC)
        const mechanism = gearA.max(gearB).max(gearC)
        const detail = gearA.add(gearB.mul(0.8)).add(gearC.mul(1.1)).clamp()
        const brass = mix(color('#5d4715'), color('#ffd98c'), detail)
        const coil = opticalLine(tube.x.mul(Math.PI * 2 * 24).add(tube.y.mul(Math.PI * 2)).sin(), 0.2)
        const pulse = time.mul(0.75).sin()
        const beat = pulse.mul(pulse).mul(0.45).add(0.7)
        const tickFlash = time.mul(3).fract().mul(-14).exp()
        const vis = facing.mul(0.55).add(0.45)
        this.colorNode = mix(mix(color('#151009'), brass, mechanism.mul(0.85)), color('#d8a63e'), coil.mul(0.85))
        this.transmission = 0.9
        this.transmissionNode = mechanism.mul(-0.7).add(0.92).clamp()
        this.roughness = 0.06
        this.ior = 1.5
        this.thickness = 0.22
        this.dispersion = 0.2
        this.attenuationColor.set('#3a2a12')
        this.attenuationDistance = 0.6
        this.clearcoat = 1
        this.clearcoatRoughness = 0.03
        this.envMapIntensity = 1.2
        this.emissiveNode = brass.mul(mechanism).mul(vis).mul(near.mul(0.8).add(0.35)).mul(beat).add(brass.mul(gearC).mul(tickFlash).mul(0.6)).add(color('#ffd98c').mul(coil).mul(0.35)).add(color('#ffe9c0').mul(glints(normalViewGeometry, 90)).mul(coil).mul(0.5))
        break
      }
      case 'storm_vessel': {
                // Lightning in a bottle: branching arcs re-strike toward whoever stands closest,
                // the storm barely smouldering from across the room and raging at arm's length.
        const {p, view, facing, grazing, near, intimate} = viewerFrame()
        const tick = time.mul(3).floor()
        const seed = mx_cell_noise_float(vec3(tick, 3.1, 7.7))
        const seed2 = mx_cell_noise_float(vec3(tick, 9.4, 1.2))
        const frac = time.mul(3).fract()
        const activity = float(0.3).add(near.mul(0.7))
        const strikeChance = seed.smoothstep(0.42, 0.85).mul(activity)
        const strike = strikeChance.mul(frac.mul(-6).exp())
        const afterglow = strikeChance.mul(frac.mul(-1.6).exp())
        const q = p.sub(view.mul(float(0.05).add(intimate.mul(0.06))))
        const warp = vec3(seed.mul(19.7), seed2.mul(7.3), seed.mul(-11.9))
        const arcField = mx_noise_float(q.mul(8).add(warp)).add(mx_noise_float(q.mul(17).add(warp.mul(2.1))).mul(0.45))
        const core = opticalLine(arcField, 0.012)
        const halo = opticalLine(arcField, 0.09)
        const idleArcs = opticalLine(mx_noise_float(q.mul(5).add(vec3(time.mul(0.21), time.mul(-0.17), time.mul(0.25)))), 0.05)
        const flicker = time.mul(43).sin().mul(0.12).add(0.88)
        const side = facing.pow(1.2).mul(0.7).add(0.3)
        const arcColor = mix(color('#4f83ff'), color('#f4faff'), core.clamp())
        const sq = p.mul(15)
        const srnd = cellNoiseVec3(sq)
        const sparks = sq.fract().sub(srnd.mul(0.6).add(0.2)).length().smoothstep(0.02, 0.3).oneMinus().mul(srnd.y.smoothstep(0.55, 0.9)).mul(strike.mul(2.2))
        this.colorNode = color('#100a1c')
        this.transmission = 0.78
        this.roughness = 0.07
        this.ior = 1.45
        this.thickness = 0.3
        this.dispersion = 0.25
        this.attenuationColor.set('#241040')
        this.attenuationDistance = 0.5
        this.clearcoat = 1
        this.clearcoatRoughness = 0.04
        this.envMapIntensity = 1.1
        this.emissiveNode = arcColor.mul(core.mul(strike).mul(4).add(halo.mul(strike).mul(1.1)).add(idleArcs.mul(0.14)).mul(side)).mul(flicker).add(color('#3d2a6b').mul(strike).mul(0.5)).add(color('#8a5cff').mul(grazing.pow(2)).mul(afterglow).mul(0.7)).add(color('#dff4ff').mul(sparks).mul(facing))
        break
      }
    }
  }
}
