import type {Node, Texture} from 'three/webgpu'

import * as tsl from 'three/tsl'
import {cameraPosition,
  color,
  float,
  mix,
  modelWorldMatrixInverse,
  mx_cell_noise_float,
  mx_fractal_noise_float,
  mx_noise_float,
  mx_noise_vec3,
  mx_worley_noise_float,
  negateOnBackSide,
  normalLocal,
  normalViewGeometry,
  positionGeometry,
  positionView,
  positionViewDirection,
  time,
  transformNormalToView,
  uv,
  vec2,
  vec3,
  vec4} from 'three/tsl'
import {DoubleSide} from 'three/webgpu'

import BaseKnotMaterial from '../base/KnotMaterial.ts'

export function spectralColor(phase: Node<'float'>) {
  return vec3(phase, phase.add(2.0944), phase.add(4.1888)).cos().mul(0.46).add(0.54)
}

export function proceduralNormal(height: Node<'float'>, strength: number) {
  const dx = positionView.dFdx()
  const dy = positionView.dFdy()
  const normal = normalViewGeometry
  const rx = dy.cross(normal)
  const ry = normal.cross(dx)
  const determinant = dx.dot(rx)
  const gradient = rx
    .mul(height.dFdx())
    .add(ry.mul(height.dFdy()))
    .mul(determinant.sign())
    .div(determinant.abs().max(1e-12))
  return negateOnBackSide(normal.sub(gradient.mul(strength)).normalize())
}

export function opticalLine(field: Node<'float'>, width: number) {
  const footprint = field.fwidth().max(0.0001)
  return field
    .abs()
    .smoothstep(width, footprint.mul(1.25).add(width))
    .oneMinus()
    .mul(footprint.smoothstep(width * 3, width * 12).oneMinus())
}

export function liquidNormal(detail: Node<'float'>, strength: Node<'float'> | number = 1) {
  const p = positionGeometry
  const a = vec3(4, 6, 3)
  const b = vec3(-3, 5, 7)
  const phaseA = p.dot(a).add(time.mul(0.045))
  const phaseB = p.dot(b).sub(time.mul(0.03))
  const warp = phaseA.sin().mul(2.8).add(phaseB.sin().mul(1.8))
  const warpGradient = a.mul(phaseA.cos()).mul(2.8).add(b.mul(phaseB.cos()).mul(1.8))
  const u = vec3(22, 8, -10)
  const v = vec3(-9, 19, 12)
  const phaseU = p.dot(u).add(warp)
  const phaseV = p.dot(v).sub(warp.mul(0.7))
  const gradientU = u.add(warpGradient)
  const gradientV = v.sub(warpGradient.mul(0.7))
  const fineAxis = vec3(39, -17, 31)
  const phaseFine = p.dot(fineAxis).add(phaseU.sin().mul(1.5))
  const gradientFine = fineAxis.add(gradientU.mul(phaseU.cos()).mul(1.5))
  const gradient = gradientU
    .mul(phaseU.cos())
    .mul(0.014)
    .add(gradientV.mul(phaseV.cos()).mul(0.012))
    .add(gradientFine.mul(phaseFine.cos()).mul(detail).mul(0.0016))
  const normal = normalLocal.normalize()
  const tangentGradient = gradient.sub(normal.mul(gradient.dot(normal)))
  return negateOnBackSide(transformNormalToView(normal.sub(tangentGradient.mul(strength)).normalize()))
}

export function opticalBands(phase: Node<'float'>) {
  const visibility = phase.fwidth().smoothstep(0.6, 3).oneMinus()
  return phase.cos().mul(visibility).mul(0.5).add(0.5)
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

export const cellNoiseVec3 = (
  tsl as typeof tsl & {
    mx_cell_noise_vec3: (position: Node<'vec3'>) => Node<'vec3'>
  }
).mx_cell_noise_vec3

export type Triple = [number, number, number]

export function cosinePalette(t: Node<'float'>,
  bias: Triple,
  amplitude: Triple,
  frequency: Triple,
  phase: Triple) {
  return vec3(...bias).add(vec3(...amplitude).mul(vec3(...frequency).mul(t).add(vec3(...phase)).mul(Math.PI * 2).cos()))
}

export function glints(normal: Node<'vec3'>, sharpness: number) {
  const lamps = [vec3(0.35, 0.78, 0.52), vec3(-0.62, 0.28, 0.73), vec3(0.1, -0.35, 0.93)]
  let sum: Node<'float'> = float(0)
  for (const lamp of lamps) {
    const half = lamp.normalize().add(positionViewDirection).normalize()
    sum = sum.add(normal.dot(half).clamp().pow(sharpness))
  }
  return sum
}

export function blackbody(t: Node<'float'>) {
  const coal = mix(color('#140805'), color('#c21400'), t.pow(0.85))
  const flame = mix(color('#ff6a12'), color('#fff3d6'), t)
  return mix(coal, flame, t)
}

export function choirPulse() {
  return time
    .mul(0.92)
    .add(positionView.length().mul(2.15))
    .sin()
    .mul(0.5)
    .add(0.5)
    .pow(5)
}

function lichtenberg(p: Node<'vec3'>, t: Node<'float'>) {
  const drift = vec3(t.mul(0.06), t.mul(-0.035), t.mul(0.048))
  const warp = mx_noise_vec3(p.mul(2.15).add(drift))
  const q = p.mul(3.4).add(warp.mul(0.92))
  const trunkField = mx_noise_float(q)
  const branchField = mx_noise_float(q.mul(2.35).add(warp.mul(1.25)))
  const hairField = mx_noise_float(q.mul(5.8).sub(drift.mul(2)))
  return {
    trunk: trunkField.abs().smoothstep(0.11, 0).pow(1.35),
    branch: branchField.abs().smoothstep(0.075, 0).pow(1.7),
    hair: hairField.abs().smoothstep(0.045, 0).pow(2.1),
    field: trunkField,
  }
}
function sealScript(q: Node<'vec3'>, density: number, seed: number) {
  const g = vec2(q.x.mul(12.5).add(q.z.mul(7.4)), q.y.mul(17.5).add(q.z.mul(3.2)))
  const cell = g.floor()
  const f = g.fract().sub(0.5)
  const rnd = cellNoiseVec3(vec3(cell, seed))
  const thick = float(0.048)
  const h1 = f.y
    .sub(rnd.y.mul(0.18).sub(0.16))
    .abs()
    .smoothstep(thick.add(0.022), thick)
    .mul(f.x.abs().smoothstep(0.42, 0.34).oneMinus())
  const h2 = f.y
    .sub(rnd.z.mul(0.2).add(0.12))
    .abs()
    .smoothstep(thick.add(0.018), thick)
    .mul(f.x.abs().smoothstep(0.38, 0.3).oneMinus())
  const v1 = f.x
    .sub(rnd.x.mul(0.28).sub(0.14))
    .abs()
    .smoothstep(thick.add(0.02), thick)
    .mul(f.y.abs().smoothstep(0.44, 0.36).oneMinus())
  const v2 = f.x
    .sub(rnd.y.mul(-0.22).add(0.1))
    .abs()
    .smoothstep(thick.add(0.016), thick)
    .mul(f.y.abs().smoothstep(0.32, 0.24).oneMinus())
  const seal = f.length().sub(rnd.z.mul(0.08).add(0.16)).abs().smoothstep(0.07, 0.028)
  const present = rnd.x.smoothstep(density, density + 0.16)
  return h1.max(h2).max(v1).max(v2).max(seal.mul(rnd.y.smoothstep(0.55, 0.7))).mul(present)
}

export const knotFinishes = [
  {
    id: 'lichtenberg_stormglass',
    title: 'Lichtenberg Stormglass',
    accent: '#cfe8ff',
  },
  {
    id: 'abyssal_nacre',
    title: 'Abyssal Nacre',
    accent: '#7de8d0',
  },
  {
    id: 'ferrofluid_oracle',
    title: 'Ferrofluid Oracle',
    accent: '#c5d0e0',
  },
  {
    id: 'tungsten_afterglow',
    title: 'Tungsten Afterglow',
    accent: '#ff6a22',
  },
  {
    id: 'mycelium_choir',
    title: 'Mycelium Choir',
    accent: '#6dffb0',
  },
  {
    id: 'birefringent_glacier',
    title: 'Birefringent Glacier',
    accent: '#9ad8ff',
  },
  {
    id: 'cinnabar_palimpsest',
    title: 'Cinnabar Palimpsest',
    accent: '#e23b2a',
  },
  {
    id: 'gallium_thaw',
    title: 'Gallium Thaw',
    accent: '#d7e0ea',
  },
] as const

export type KnotFinish = (typeof knotFinishes)[number]['id']

export class GrokBuildMaterial extends BaseKnotMaterial {
  constructor(finish: KnotFinish, environment: Texture) {
    super(environment)
    this.name = finish
    switch (finish) {
      case 'lichtenberg_stormglass': {
        const {p, view, facing, grazing, rim, near, intimate} = viewerFrame()
        const inner = p.sub(view.mul(0.16))
        const deep = p.sub(view.mul(0.3))
        const bolt = lichtenberg(inner, time)
        const echo = lichtenberg(deep, time.mul(0.72).add(2.7))
        const surge = time.mul(1.55).sin().mul(0.5).add(0.5).pow(9)
        const flicker = time.mul(41).sin().abs()
        const crawl = intimate.mul(0.22).add(near.mul(0.12))
        const live = surge.mul(flicker.mul(0.55).add(0.45)).add(crawl)
        const glassFog = mx_fractal_noise_float(inner.mul(3.1), 3, 2, 0.5).mul(0.5).add(0.5)
        const burns = bolt.trunk.max(bolt.branch.mul(0.7)).max(echo.trunk.mul(0.45))
        const silica = mix(color('#0b1016'), color('#1c2a38'), glassFog.mul(grazing).mul(0.6).add(0.2))
        this.colorNode = mix(silica, color('#07080a'), burns.mul(0.55))
        this.transmissionNode = burns.oneMinus().mul(facing.mul(0.35).add(0.55)).mul(near.mul(-0.15).add(0.92))
        this.thickness = 0.55
        this.ior = 1.48
        this.dispersion = 0.42
        this.attenuationColor.set('#1a3355')
        this.attenuationDistance = 0.45
        this.roughnessNode = burns.mul(0.22).add(0.04)
        this.metalnessNode = burns.mul(0.25)
        this.clearcoat = 1
        this.clearcoatRoughness = 0.03
        this.normalNode = proceduralNormal(bolt.field.mul(0.4).add(glassFog.mul(0.2)), 0.0024)
        this.emissiveNode = color('#eaf4ff')
          .mul(bolt.trunk)
          .mul(live.add(0.1))
          .mul(1.8)
          .add(color('#7aa7ff').mul(bolt.branch).mul(live.add(0.08)).mul(1.35))
          .add(color('#b388ff').mul(bolt.hair).mul(near.mul(0.8).add(intimate)))
          .add(color('#9ecbff').mul(echo.trunk).mul(live).mul(0.55))
          .add(color('#3a5080').mul(rim).mul(0.12))
        break
      }
      case 'abyssal_nacre': {
        const {p, view, facing, grazing, rim, near, intimate} = viewerFrame()
        const inner = p.sub(view.mul(0.045))
        const stack = mx_noise_float(inner.mul(6.2)).add(mx_fractal_noise_float(inner.mul(2.4), 3, 2.1, 0.48).mul(0.45))
        const platelets = mx_cell_noise_float(inner.mul(36))
        const terrace = opticalBands(stack.mul(38).add(platelets.mul(8)))
        const path = inner
          .dot(view)
          .mul(3.8)
          .add(stack.mul(4.2))
          .add(view.x.mul(1.8))
          .add(view.y.mul(1.2))
          .add(facing.mul(2.4))
        const play = cosinePalette(path, [0.42, 0.46, 0.4], [0.55, 0.48, 0.5], [1, 0.82, 1.18], [0, 0.33, 0.67])
        const abalone = mix(color('#07120f'), play, facing.mul(0.45).add(grazing.mul(0.7)).clamp())
        const tile = uv()
        const growth = opticalLine(tile.x.mul(28).add(stack.mul(2)).fract().sub(0.5), 0.06).mul(intimate)
        const sparkle = glints(normalViewGeometry.add(cellNoiseVec3(inner.mul(22)).mul(2).sub(1).mul(0.2)).normalize(), 70)
        this.colorNode = mix(abalone, play.mul(1.15), terrace.mul(0.28).add(growth.mul(0.35)))
        this.metalness = 0.18
        this.roughnessNode = terrace.mul(0.08).add(grazing.mul(0.12)).add(0.08)
        this.iridescence = 1
        this.iridescenceIOR = 1.42
        this.iridescenceThicknessNode = stack.mul(140).add(facing.mul(220)).add(280)
        this.clearcoat = 1
        this.clearcoatRoughness = 0.045
        this.sheen = 0.55
        this.sheenColor.set('#9ae8d4')
        this.sheenRoughness = 0.35
        this.normalNode = proceduralNormal(stack.mul(0.35).add(platelets.mul(0.12)), 0.0018)
        this.emissiveNode = play
          .mul(grazing.pow(1.4).mul(0.55).add(terrace.mul(0.4)))
          .mul(near.mul(0.55).add(0.35))
          .add(play.mul(sparkle).mul(intimate).mul(0.9))
          .add(color('#05332c').mul(rim).mul(0.16))
        break
      }
      case 'ferrofluid_oracle': {
        const {p, view, grazing, rim, near, intimate} = viewerFrame()
        const n = normalLocal.normalize()
        const align = n.dot(view).max(0).pow(2.15)
        const cells = mx_worley_noise_float(p.mul(15.5))
        const peak = cells.oneMinus().pow(7.5)
        const breath = time.mul(2.05).sin().mul(0.08).add(0.94)
        const height = peak
          .mul(align)
          .mul(near.mul(0.55).add(0.45))
          .mul(breath)
          .mul(intimate.mul(0.35).add(0.72))
          .mul(0.095)
        this.positionNode = positionGeometry.add(n.mul(height))
        const surfaceNormal = proceduralNormal(height, 0.85)
        this.normalNode = surfaceNormal
        this.clearcoatNormalNode = surfaceNormal
        const tip = height.smoothstep(0.018, 0.072)
        const valley = height.oneMinus()
        const meniscus = opticalLine(cells.sub(0.18), 0.03).mul(align)
        const oil = mix(color('#050506'), color('#16141a'), valley.mul(grazing).mul(0.35))
        const silver = mix(color('#9aa6b5'), color('#e7eef6'), tip.pow(2))
        this.colorNode = mix(oil, silver, tip.mul(0.85).add(meniscus.mul(0.4)))
        this.metalnessNode = tip.mul(0.28).add(0.72)
        this.roughnessNode = valley.mul(0.32).add(0.028)
        this.clearcoat = 0.35
        this.clearcoatRoughness = 0.2
        this.envMapIntensity = 1.15
        this.emissiveNode = silver
          .mul(glints(surfaceNormal, 110))
          .mul(tip)
          .mul(1.55)
          .mul(near.mul(0.5).add(0.5))
          .add(color('#2a3340').mul(meniscus).mul(0.25))
          .add(color('#0a0b0e').mul(rim).mul(0.2))
        break
      }
      case 'tungsten_afterglow': {
        const {p, facing, grazing, rim, near, intimate} = viewerFrame()
        const tube = uv()
        const coil = opticalBands(tube.x.mul(168).add(tube.y.mul(7)))
        const travelling = tube.x.mul(Math.PI * 10).add(time.mul(0.62)).sin().mul(0.5).add(0.5).pow(1.8)
        const work = facing.mul(0.38).add(near.mul(0.4)).add(intimate.mul(0.34))
        const temperature = travelling.mul(work).mul(0.72).add(work.mul(0.28)).add(coil.mul(0.18)).clamp()
        const heat = blackbody(temperature)
        const coolMetal = mix(color('#121214'), color('#3a3d44'), grazing.mul(0.5).add(mx_noise_float(p.mul(9)).mul(0.12)))
        this.colorNode = mix(coolMetal, mix(color('#2a1208'), heat, temperature), temperature)
        this.metalnessNode = temperature.oneMinus().mul(0.45).add(0.5)
        this.roughnessNode = coil.mul(0.07).add(temperature.oneMinus().mul(0.28)).add(0.04)
        this.clearcoat = 0.15
        this.clearcoatRoughness = 0.4
        this.normalNode = proceduralNormal(coil.mul(0.45).add(mx_noise_float(p.mul(18)).mul(0.2)), 0.0022)
        this.emissiveNode = heat
          .mul(temperature.pow(1.6))
          .mul(1.85)
          .mul(near.mul(0.45).add(0.55))
          .add(color('#ff9a40').mul(coil).mul(temperature).mul(0.35))
          .add(color('#4a1808').mul(rim).mul(temperature.mul(0.2).add(0.08)))
        this.envMapIntensity = 0.55
        break
      }
      case 'mycelium_choir': {
        const {p, view, facing, grazing, rim, near, intimate} = viewerFrame()
        const inner = p.sub(view.mul(0.08))
        const bark = mx_fractal_noise_float(p.mul(3.4), 4, 2.15, 0.5)
        const veinField = mx_noise_float(inner.mul(7.2).add(vec3(0, time.mul(0.04), 0)))
        const hyphae = opticalLine(veinField, 0.045)
        const hyphaeFine = opticalLine(mx_noise_float(inner.mul(18.5).add(veinField.mul(1.4))), 0.03).mul(near.mul(0.4).add(intimate))
        const nodes = mx_cell_noise_float(inner.mul(22)).smoothstep(0.9, 0.97)
        const pulse = choirPulse()
        const choir = hyphae.mul(pulse.mul(0.75).add(0.25)).add(hyphaeFine.mul(0.65)).add(nodes.mul(pulse).mul(1.2))
        const fruit = mx_worley_noise_float(inner.mul(8.5)).oneMinus().pow(5).mul(intimate)
        const spores = mx_cell_noise_float(p.sub(view.mul(0.14)).mul(54)).smoothstep(0.982, 0.992).mul(intimate)
        const rind = mix(color('#1c1712'), color('#5a4a38'), bark.mul(0.5).add(0.5))
        const pale = mix(color('#c4b49a'), color('#7a6a52'), grazing)
        this.colorNode = mix(mix(rind, pale, facing.mul(0.25)), color('#2a241c'), hyphae.mul(0.55))
        this.metalness = 0
        this.roughnessNode = bark.mul(0.18).add(hyphae.mul(-0.12)).add(0.42)
        this.clearcoat = 0.12
        this.clearcoatRoughness = 0.5
        this.sheen = 0.9
        this.sheenColor.set('#8fbf90')
        this.sheenRoughness = 0.48
        this.transmissionNode = fruit.mul(0.35).add(spores.mul(0.15))
        this.thickness = 0.25
        this.ior = 1.4
        this.attenuationColor.set('#1a3d28')
        this.attenuationDistance = 0.35
        this.normalNode = proceduralNormal(bark.mul(0.5).add(hyphae.mul(0.35)), 0.0026)
        this.emissiveNode = mix(color('#146b3a'), color('#9dffc2'), facing)
          .mul(choir)
          .mul(1.45)
          .mul(near.mul(0.5).add(0.55))
          .add(color('#eaffd2').mul(nodes).mul(pulse).mul(1.8))
          .add(color('#d4ff8a').mul(spores).mul(2.1))
          .add(color('#3a5a28').mul(rim).mul(0.1))
        break
      }
      case 'birefringent_glacier': {
        const {p, view, facing, grazing, rim, near, intimate} = viewerFrame()
        const inner = p.sub(view.mul(0.2))
        const stress = mx_fractal_noise_float(inner.mul(4.6), 4, 2, 0.52)
        const cracks = opticalLine(stress.mul(6.5).sin(), 0.05).add(opticalLine(mx_noise_float(inner.mul(9.5)).mul(14).sin(), 0.04).mul(0.7))
        const polar = normalViewGeometry.cross(view).length().clamp()
        const slow = spectralColor(stress.mul(5).add(polar.mul(3.2)).add(view.x.mul(2)))
        const fast = spectralColor(stress.mul(5).add(polar.mul(3.2)).add(2.094).add(view.y.mul(1.5)))
        const biref = mix(slow, fast, polar.mul(0.65).add(grazing.mul(0.35)))
        const bubbles = mx_cell_noise_float(inner.mul(28)).smoothstep(0.93, 0.985)
        const caustic = mx_noise_float(vec3(p.x.mul(9), p.y.mul(2).add(time.mul(0.18)), p.z.mul(9)))
          .mul(7)
          .sin()
          .abs()
          .pow(4)
        const frostField = mx_noise_float(p.mul(20)).abs()
        const dendrite = frostField
          .smoothstep(0.09, 0)
          .mul(mx_noise_float(p.mul(8.5)).abs().smoothstep(0.28, 0.04))
        const frost = dendrite.mul(near.pow(1.35)).mul(intimate.mul(0.45).add(0.55))
        const ice = mix(color('#0a1c28'), color('#d7eefc'), facing.mul(0.35).add(0.1))
        this.colorNode = mix(mix(ice, biref, cracks.mul(0.45).add(0.2)), color('#eef6ff'), frost.mul(0.85))
        this.transmissionNode = frost.oneMinus().mul(0.55).add(0.4).mul(facing.mul(0.2).add(0.78))
        this.thickness = 0.7
        this.ior = 1.31
        this.dispersion = 0.5
        this.attenuationColor.set('#7ec8e6')
        this.attenuationDistance = 0.55
        this.roughnessNode = frost.mul(0.38).add(0.02)
        this.metalness = 0
        this.clearcoat = 1
        this.clearcoatRoughnessNode = frost.mul(0.22).add(0.02)
        this.iridescence = 0.45
        this.iridescenceIOR = 1.33
        this.iridescenceThicknessNode = polar.mul(180).add(220)
        this.normalNode = liquidNormal(near.mul(0.4).add(frost.mul(1.4)), 0.16)
        this.emissiveNode = biref
          .mul(cracks)
          .mul(near.mul(0.6).add(0.3))
          .mul(0.85)
          .add(color('#cfefff').mul(bubbles).mul(intimate).mul(1.3))
          .add(color('#8fd4ff').mul(caustic).mul(facing).mul(0.22))
          .add(color('#f4fbff').mul(frost).mul(glints(normalViewGeometry, 80)).mul(0.6))
          .add(color('#4a7a94').mul(rim).mul(0.12))
        break
      }
      case 'cinnabar_palimpsest': {
        const {p, view, facing, grazing, rim, near, intimate} = viewerFrame()
        const layer0 = sealScript(p, 0.28, 3.1)
        const layer1 = sealScript(p.sub(view.mul(0.028)), 0.34, 11.7)
        const layer2 = sealScript(p.sub(view.mul(0.07)), 0.4, 23.4)
        const ghost = layer1.mul(near.mul(0.75).add(0.1))
        const deepText = layer2.mul(intimate)
        const cut = layer0.mul(near.mul(0.5).add(0.2)).max(ghost.mul(0.85)).max(deepText)
        const verdigris = mix(color('#1f4a3a'), color('#6ea48a'), facing).mul(cut).mul(intimate.mul(0.7).add(0.2))
        const lacquer = mix(color('#4a0908'), color('#c4281c'), grazing.pow(1.5).mul(0.7).add(mx_noise_float(p.mul(2.2)).mul(0.08)).clamp())
        const sealed = mix(color('#2a0706'), lacquer, facing.mul(0.35).add(0.45))
        this.colorNode = mix(mix(sealed, color('#6a120e'), cut.mul(0.55)), verdigris, cut.mul(intimate).mul(0.65))
        this.metalnessNode = cut.mul(0.15)
        this.roughnessNode = float(0.22).mix(0.12, cut).add(grazing.mul(0.05))
        this.clearcoat = 1
        this.clearcoatRoughness = 0.04
        this.normalNode = proceduralNormal(cut.mul(0.55).add(mx_noise_float(p.mul(12)).mul(0.12)), 0.0014)
        this.iridescence = 0.12
        this.iridescenceIOR = 1.45
        this.iridescenceThicknessNode = facing.mul(80).add(160)
        this.emissiveNode = color('#3a0a08')
          .mul(rim)
          .mul(0.18)
          .add(color('#ff6a3a').mul(cut).mul(intimate).mul(0.22))
          .add(verdigris.mul(0.35).mul(near))
        break
      }
      case 'gallium_thaw': {
        const {p, facing, grazing, rim, near, intimate} = viewerFrame()
        const melt = near.mul(0.62).add(intimate.mul(0.38)).clamp()
        const drips = opticalLine(p.x.mul(13).add(p.z.mul(9.5)).add(p.y.mul(-5.5)).add(time.mul(0.28)).sin(), 0.038).mul(melt)
        const beads = mx_cell_noise_float(vec3(p.x.mul(9.5), p.y.mul(3.6).sub(time.mul(0.45)), p.z.mul(9.5)))
          .smoothstep(0.9, 0.975)
          .mul(melt)
        const wetting = opticalLine(uv().y.sub(0.5), 0.07).mul(melt).mul(intimate)
        const solid = mix(color('#6e7378'), color('#9aa0a6'), grazing.mul(0.45).add(0.2))
        const liquid = mix(color('#c5ced8'), color('#eef3f7'), facing)
        this.colorNode = mix(solid, mix(liquid, color('#f4f7fa'), beads.max(drips)), melt)
        this.metalnessNode = melt.mul(0.22).add(0.76)
        this.roughnessNode = melt.oneMinus().mul(0.48).add(0.018).add(beads.mul(-0.01))
        this.clearcoat = 1
        this.clearcoatRoughnessNode = melt.oneMinus().mul(0.28).add(0.02)
        this.envMapIntensity = 1.25
        this.normalNode = liquidNormal(melt.mul(1.4).add(0.15), melt.mul(0.38).add(0.04))
        this.iridescenceNode = melt.mul(0.18)
        this.iridescenceIOR = 1.6
        this.iridescenceThicknessNode = melt.mul(90).add(120)
        this.emissiveNode = liquid
          .mul(glints(normalViewGeometry, 95))
          .mul(melt)
          .mul(0.55)
          .add(color('#dfe7ee').mul(beads).mul(glints(normalViewGeometry, 140)).mul(1.4))
          .add(color('#b7c2cc').mul(drips.add(wetting)).mul(0.28))
          .add(color('#2a3036').mul(rim).mul(melt.oneMinus().mul(0.2)))
        this.side = DoubleSide
        break
      }
    }
  }
}
