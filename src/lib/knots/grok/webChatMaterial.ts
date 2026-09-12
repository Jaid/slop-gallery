import type {Node, Texture} from 'three/webgpu'

import * as tsl from 'three/tsl'
import {cameraPosition, color, float, mix, modelWorldMatrixInverse, mx_cell_noise_float, mx_fractal_noise_float, mx_noise_float, mx_noise_vec3, negateOnBackSide, normalLocal, normalViewGeometry, positionGeometry, positionView, positionViewDirection, time, transformNormalToView, uv, vec3, vec4} from 'three/tsl'
import {DoubleSide, MeshPhysicalNodeMaterial} from 'three/webgpu'

export function spectralColor(phase: Node<'float'>) {
  return vec3(phase, phase.add(2.0944), phase.add(4.1888)).cos().mul(0.46).add(0.54)
}

export function filament(field: Node<'float'>, width: number) {
  return field.abs().smoothstep(width, field.fwidth().mul(1.2).max(0.0001).add(width)).oneMinus()
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

export function opticalLine(field: Node<'float'>, width: number) {
  const footprint = field.fwidth().max(0.0001)
  return field.abs().smoothstep(width, footprint.mul(1.25).add(width)).oneMinus().mul(footprint.smoothstep(width * 3, width * 12).oneMinus())
}

export function liquidNormal(detail: Node<'float'>, strength = 1) {
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
  const gradient = gradientU.mul(phaseU.cos()).mul(0.014).add(gradientV.mul(phaseV.cos()).mul(0.012)).add(gradientFine.mul(phaseFine.cos()).mul(detail).mul(0.0016))
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

export const cellNoiseVec3 = (tsl as typeof tsl & {
  mx_cell_noise_vec3: (position: Node<'vec3'>) => Node<'vec3'>
}).mx_cell_noise_vec3

export type Triple = [number, number, number]

export function cosinePalette(t: Node<'float'>, bias: Triple, amplitude: Triple, frequency: Triple, phase: Triple) {
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

function heartbeat() {
  const t = time.mul(1.37)
  const primary = t.mul(Math.PI * 2).sin().max(0).pow(3)
  const echo = t.mul(Math.PI * 2).sub(0.28).sin().max(0).pow(4).mul(0.55)
  return primary.add(echo).mul(0.55).add(0.45)
}
function dendriticField(p: Node<'vec3'>, scale: number) {
  const warp = mx_fractal_noise_float(p.mul(scale * 0.55), 3, 2, 0.55).mul(0.85)
  const branch = mx_noise_float(p.mul(scale).add(vec3(warp, warp.mul(-0.6), warp.mul(0.4))))
  const vein = mx_noise_float(p.mul(scale * 2.4).add(vec3(3.1, warp.mul(2), -1.7)))
  return branch.mul(0.65).add(vein.mul(0.35))
}

export const knotFinishesPremium = [
  {
    id: 'velvet_umbra',
    title: 'Velvet Umbra',
    accent: '#c4a06a',
  },
  {
    id: 'gossamer_dew',
    title: 'Gossamer Dew',
    accent: '#d7ecff',
  },
  {
    id: 'cinder_meridian',
    title: 'Cinder Meridian',
    accent: '#ff6a1a',
  },
  {
    id: 'ventricle_glass',
    title: 'Ventricle Glass',
    accent: '#ff4a6a',
  },
  {
    id: 'ion_wake',
    title: 'Ion Wake',
    accent: '#6cf0ff',
  },
  {
    id: 'hoarfrost_lattice',
    title: 'Hoarfrost Lattice',
    accent: '#c5e7ff',
  },
  {
    id: 'cinnabar_edict',
    title: 'Cinnabar Edict',
    accent: '#e31c13',
  },
  {
    id: 'polar_opal',
    title: 'Polar Opal',
    accent: '#ff7ad9',
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
      case 'velvet_umbra': {
        const {p, facing, grazing, rim, near, intimate} = viewerFrame()
        const tube = uv()
        const pile = mx_fractal_noise_float(p.mul(18), 3, 2.2, 0.45)
        const nap = mx_noise_float(p.mul(42).add(vec3(tube.x.mul(6), 0, tube.y.mul(2))))
        const crush = facing.smoothstep(0.18, 0.72)
        const bloom = grazing.pow(2.4).mul(near.mul(0.35).add(0.65))
        const warpThread = opticalLine(tube.y.mul(7).add(tube.x.mul(18)).add(pile.mul(0.35)).fract().sub(0.5), 0.04).mul(intimate)
        const pileColor = mix(color('#3a2410'), color('#e7c792'), bloom)
        const voidColor = mix(color('#050302'), color('#120a06'), nap.mul(0.12).add(0.04))
        this.envMapIntensity = 0.12
        this.colorNode = mix(voidColor, pileColor.mul(0.22), bloom.mul(0.45))
        this.metalness = 0
        this.roughnessNode = crush.mul(0.22).add(0.62).sub(warpThread.mul(0.08))
        this.sheenNode = mix(color('#24160c'), color('#f0d7a6'), bloom.add(warpThread.mul(0.35)))
        this.sheenRoughnessNode = float(0.42).mix(0.18, grazing.pow(1.5))
        this.anisotropy = 0.72
        this.clearcoat = 0
        this.normalNode = proceduralNormal(pile.mul(0.55).add(nap.mul(0.45)), 0.012)
        this.emissiveNode = color('#e8c888')
          .mul(bloom)
          .mul(0.07)
          .mul(near.mul(0.5).add(0.4))
          .add(color('#8a5a28').mul(warpThread).mul(glints(normalViewGeometry, 48)).mul(0.35))
          .add(color('#1a0c04').mul(rim).mul(0.08))
        break
      }
      case 'gossamer_dew': {
        // Keep the source concept while avoiding Chromium/Tint failures from its
        // transparent vector-noise path: woven silk, beaded dew and thin-film fire.
        this.side = DoubleSide
        this.envMapIntensity = 0.65
        const {p, grazing, rim, near, intimate} = viewerFrame()
        const tube = uv()
        const silkU = opticalLine(tube.x.mul(220).add(tube.y.mul(6).sin().mul(2.5)).fract().sub(0.5), 0.028)
        const silkV = opticalLine(tube.y.mul(14).add(tube.x.mul(2.5).sin().mul(0.4)).fract().sub(0.5), 0.04)
        const silkFine = opticalLine(tube.x.mul(520).add(mx_noise_float(p.mul(8)).mul(2)).fract().sub(0.5), 0.02).mul(intimate)
        const silk = silkU.max(silkV).add(silkFine.mul(0.7)).clamp()
        const dewNoise = mx_cell_noise_float(p.mul(42).add(vec3(17.3, 41.9, 8.2)))
        const dew = dewNoise.smoothstep(0.91, 0.985).mul(near.mul(0.55).add(0.45))
        const film = spectralColor(p.x.mul(1.7).add(p.y.mul(1.1)).add(grazing.mul(2.6)))
        const weave = silk.mul(0.72).add(dew.mul(0.48)).clamp()
        this.colorNode = mix(color('#263746'), film, weave.mul(0.65).add(0.12))
        this.metalnessNode = dew.mul(0.18)
        this.roughnessNode = float(0.3).sub(silk.mul(0.18)).sub(dew.mul(0.12)).max(0.035)
        this.ior = 1.38
        this.clearcoat = 1
        this.clearcoatRoughness = 0.025
        this.iridescence = 1
        this.iridescenceIOR = 1.25
        this.iridescenceThicknessNode = grazing.mul(180).add(240)
        this.normalNode = proceduralNormal(silk.mul(0.45).add(dew.mul(0.8)), 0.0025)
        this.emissiveNode = film.mul(silk).mul(0.18).mul(near.mul(0.55).add(0.35))
          .add(color('#fff6e8').mul(dew).mul(glints(normalViewGeometry, 110)).mul(1.8))
          .add(color('#b8d4ff').mul(rim).mul(0.1))
        break
      }
      case 'cinder_meridian': {
        const {p, grazing, rim, near, intimate} = viewerFrame()
        const tube = uv()
        const breath = heartbeat()
        const wind = near.mul(0.55).add(0.45).mul(breath)
        const crust = mx_fractal_noise_float(p.mul(7.5), 4, 2, 0.5)
        const ash = mx_noise_float(p.mul(22))
        const meridian = opticalLine(tube.x.mul(18).add(tube.y.mul(Math.PI * 2).sin().mul(0.35)).add(crust.mul(0.4)).sin(), 0.045)
        const meridianFine = opticalLine(tube.x.mul(48).add(ash.mul(1.2)).sin(), 0.03).mul(intimate)
        const cracks = opticalLine(crust.mul(7).add(p.y.mul(2)), 0.05)
        const micro = opticalLine(mx_noise_float(p.mul(40)).mul(6), 0.035).mul(intimate)
        const fissure = meridian.max(cracks).add(meridianFine.mul(0.75)).add(micro.mul(0.4)).clamp()
        const emberCore = fissure.pow(1.6).mul(wind)
        const heat = mix(color('#3a0700'), mix(color('#ff3a00'), color('#ffe7a0'), emberCore.pow(2)), emberCore)
        const scale = crust.smoothstep(-0.2, 0.55)
        this.envMapIntensity = 0.22
        this.colorNode = mix(color('#070504'), mix(color('#2a1a12'), color('#120a08'), ash), scale)
        this.metalnessNode = fissure.mul(0.12)
        this.roughnessNode = scale.mul(0.35).add(0.48).sub(fissure.mul(0.28))
        this.clearcoat = 0.15
        this.clearcoatRoughness = 0.4
        this.normalNode = proceduralNormal(crust.mul(0.7).add(ash.mul(0.3)).add(fissure.mul(0.4)), 0.018)
        this.emissiveNode = heat
          .mul(emberCore)
          .mul(1.8)
          .mul(near.mul(0.7).add(0.45))
          .add(color('#ff8a3a').mul(grazing.pow(3)).mul(fissure).mul(0.25))
          .add(color('#4a1208').mul(rim).mul(0.12))
          .add(color('#fff4c8').mul(micro).mul(wind).mul(intimate).mul(0.8))
        break
      }
      case 'ventricle_glass': {
        const {p, view, facing, grazing, rim, near, intimate} = viewerFrame()
        const beat = heartbeat()
        const inner = p.sub(view.mul(0.16))
        const deep = p.sub(view.mul(0.3))
        const chamber = mx_fractal_noise_float(inner.mul(4.2).add(vec3(0, beat.mul(0.12), 0)), 3, 2, 0.5)
        const vessel = dendriticField(inner, 11)
        const capillaries = dendriticField(deep.add(vec3(2.2, -1.4, 0.7)), 24)
        const artery = opticalLine(vessel.mul(6.5), 0.05)
        const capillary = opticalLine(capillaries.mul(8), 0.03).mul(intimate)
        const lumen = chamber.smoothstep(-0.15, 0.4).oneMinus().mul(facing.mul(0.4).add(0.6))
        const plasma = mix(color('#3a0014'), color('#ff6b8a'), lumen.add(beat.mul(0.15)))
        const veinLight = mix(color('#6b0018'), color('#ffd1c8'), capillary.add(artery))
        this.colorNode = mix(color('#1a0308'), plasma, lumen.mul(0.55).add(0.2))
        this.metalness = 0
        this.roughnessNode = artery.mul(-0.06).add(0.08)
        this.transmission = 0.78
        this.thicknessNode = beat.mul(0.12).add(0.42)
        this.ior = 1.46
        this.dispersion = 0.18
        this.attenuationColor.set('#6a1028')
        this.attenuationDistance = 0.28
        this.clearcoat = 1
        this.clearcoatRoughness = 0.03
        this.iridescence = 0.22
        this.iridescenceIOR = 1.4
        this.iridescenceThicknessNode = facing.mul(120).add(280)
        this.normalNode = liquidNormal(intimate.mul(0.6).add(0.2), 0.09)
        this.emissiveNode = veinLight
          .mul(artery.add(capillary.mul(0.8)))
          .mul(beat)
          .mul(1.15)
          .mul(near.mul(0.55).add(0.5))
          .add(color('#ff8aa8').mul(lumen).mul(beat).mul(0.22).mul(intimate.mul(0.5).add(0.35)))
          .add(color('#4a0010').mul(rim).mul(0.16))
          .add(color('#fff0e8').mul(glints(normalViewGeometry, 90)).mul(grazing).mul(0.08))
        break
      }
      case 'ion_wake': {
        this.envMapIntensity = 0.18
        const {p, view, facing, grazing, rim, near, intimate} = viewerFrame()
        const tube = uv()
        const drift = time.mul(0.65)
        const magnetic = view.cross(vec3(0.15, 1, 0.08)).normalize()
        const binormal = magnetic.cross(view).normalize()
        const sheetA = p.mul(vec3(8, 3.5, 8)).dot(magnetic).add(p.y.mul(10)).add(drift)
        const sheetB = p.mul(6.5).dot(binormal).add(tube.x.mul(22)).sub(drift.mul(0.7))
        const sheetC = p.dot(vec3(2.4, 9, -3.1)).add(view.x.mul(6)).add(drift.mul(1.3))
        const wakeA = opticalLine(sheetA.sin(), 0.032)
        const wakeB = opticalLine(sheetB.sin(), 0.028)
        const wakeC = opticalLine(sheetC.mul(1.6).sin(), 0.022).mul(intimate)
        const braid = wakeA.mul(0.9).add(wakeB.mul(0.75)).add(wakeC.mul(0.55)).clamp()
        const scintilla = mx_cell_noise_float(p.mul(48).add(vec3(0, time.mul(2.4), 0))).smoothstep(0.97, 0.992).mul(intimate)
        const doppler = magnetic.dot(vec3(p.x, 0, p.z).normalize()).mul(0.5).add(0.5)
        const plasma = mix(color('#3a6cff'), mix(color('#79fff2'), color('#f0b8ff'), doppler), braid)
        const corona = grazing.pow(2.2).mul(near.mul(0.4).add(0.5))
        this.colorNode = color('#02040a')
        this.metalness = 0.15
        this.roughness = 0.22
        this.clearcoat = 0.7
        this.clearcoatRoughness = 0.08
        this.iridescence = 0.4
        this.iridescenceIOR = 1.2
        this.iridescenceThicknessNode = facing.mul(220).add(180)
        this.normalNode = proceduralNormal(braid.mul(0.35).add(mx_noise_float(p.mul(16).add(view)).mul(0.2)), 0.004)
        this.emissiveNode = plasma
          .mul(braid)
          .mul(1.65)
          .mul(near.mul(0.65).add(0.5))
          .add(color('#e8ffff').mul(scintilla).mul(2.4))
          .add(mix(color('#1b4dff'), color('#9bfff4'), doppler).mul(corona).mul(0.28))
          .add(color('#6a2aff').mul(rim).mul(0.12))
          .add(color('#ffffff').mul(wakeC).mul(glints(normalViewGeometry, 70)).mul(0.35))
        break
      }
      case 'hoarfrost_lattice': {
        const {p, view, facing, grazing, rim, near, intimate} = viewerFrame()
        const inner = p.sub(view.mul(0.08))
        const fern = dendriticField(inner, 9)
        const lattice = dendriticField(inner.mul(1.4).add(vec3(4.2, -2.8, 1.1)), 19)
        const bloom = mx_noise_float(p.mul(5.5)).smoothstep(0.15, 0.62)
        const ridge = opticalLine(fern.mul(7.5), 0.042)
        const crystal = opticalLine(lattice.mul(10), 0.03).mul(intimate.add(0.25))
        const facet = mx_cell_noise_float(p.mul(14)).mul(0.5).add(mx_cell_noise_float(p.mul(28)).mul(0.5))
        const sparkle = glints(normalViewGeometry.add(mx_noise_vec3(p.mul(20)).sub(0.5).mul(0.35)).normalize(), 140)
          .mul(crystal.add(ridge.mul(0.4)))
          .mul(intimate.mul(0.6).add(0.4))
        const iceBody = mix(color('#8fb4c8'), color('#eef8ff'), bloom.mul(0.55).add(facing.mul(0.25)))
        const rime = mix(iceBody, color('#ffffff'), ridge.add(crystal).clamp())
        this.colorNode = rime
        this.metalness = 0.05
        this.roughnessNode = float(0.22).sub(ridge.mul(0.12)).sub(sparkle.mul(0.08)).max(0.03)
        this.transmission = 0.62
        this.thickness = 0.55
        this.ior = 1.31
        this.dispersion = 0.55
        this.attenuationColor.set('#9fc4d8')
        this.attenuationDistance = 0.4
        this.clearcoat = 1
        this.clearcoatRoughness = 0.045
        this.iridescence = 0.35
        this.iridescenceIOR = 1.18
        this.iridescenceThicknessNode = fern.mul(160).add(240)
        this.normalNode = proceduralNormal(fern.mul(0.6).add(facet.mul(0.25)).add(crystal.mul(0.4)), 0.007)
        this.emissiveNode = color('#d8f2ff')
          .mul(ridge.add(crystal.mul(0.8)))
          .mul(0.18)
          .mul(near.mul(0.5).add(0.35))
          .add(mix(color('#fff4d8'), color('#b8deff'), facing).mul(sparkle).mul(1.6))
          .add(color('#7aa0b8').mul(grazing.pow(2)).mul(0.08))
          .add(color('#e8f6ff').mul(rim).mul(0.05))
        break
      }
      case 'cinnabar_edict': {
        const {p, facing, grazing, rim, near, intimate} = viewerFrame()
        const tube = uv()
        const q = p.mul(5.4)
        const cell = cellNoiseVec3(q)
        const cell2 = cellNoiseVec3(q.add(vec3(19.7, 4.3, 28.1)))
        const local = q.fract().sub(0.5)
        const stamp = local.length().smoothstep(0.46, 0.32)
        const carved = opticalLine(local.x.mul(cell.x.mul(14).add(4)).add(local.y.mul(cell.y.mul(11).add(3))).add(cell2.z.mul(2)).sin(), 0.05)
        const stroke = opticalLine(local.y.mul(cell2.x.mul(9).add(2.5)).sub(local.x.mul(cell2.y.mul(7).add(2))).cos(), 0.04)
        const frame = opticalLine(local.x.abs().max(local.y.abs()).sub(0.31), 0.03)
        const seal = stamp.mul(carved.max(stroke).max(frame))
        const script = opticalLine(tube.x.mul(36).add(tube.y.mul(8)).add(mx_noise_float(p.mul(3)).mul(2)).fract().sub(0.5), 0.03).mul(intimate)
        const inlay = seal.max(script)
        const lacquerNoise = mx_noise_float(p.mul(3.2)).mul(0.08)
        const lacquer = mix(color('#140204'), color('#9a120d'), grazing.pow(1.7).mul(0.75).add(lacquerNoise).clamp())
        const vermillion = mix(color('#6a0706'), color('#e23a22'), facing.mul(0.4).add(0.35))
        const gold = mix(color('#8a5a18'), color('#ffe3a0'), glints(normalViewGeometry, 64).add(grazing.mul(0.3)))
        this.colorNode = mix(mix(lacquer, vermillion, stamp.mul(0.55).add(0.2)), gold, inlay)
        this.metalnessNode = inlay.mul(0.92)
        this.roughnessNode = float(0.38).mix(0.16, inlay)
        this.clearcoat = 1
        this.clearcoatRoughness = 0.04
        this.normalNode = proceduralNormal(inlay.mul(0.55).add(mx_noise_float(p.mul(16)).mul(0.12)), 0.0018)
        this.emissiveNode = gold
          .mul(inlay)
          .mul(glints(normalViewGeometry, 50))
          .mul(0.85)
          .mul(near.mul(0.55).add(0.4))
          .add(color('#ff5a32').mul(stamp.oneMinus()).mul(grazing).mul(0.04))
          .add(color('#3a0504').mul(rim).mul(0.14))
          .add(color('#ffd27a').mul(script).mul(intimate).mul(0.35))
        break
      }
      case 'polar_opal': {
        const {p, view, grazing, rim, near, intimate} = viewerFrame()
        const roll = view.dot(vec3(0.7, 0.2, 0.68)).add(view.y.mul(0.35))
        const domain = p.mul(2.8).add(view.mul(0.45))
        const potch = mx_fractal_noise_float(domain, 4, 2.1, 0.48)
        const fireMask = potch.smoothstep(0.02, 0.42)
        const sheet = mx_noise_float(p.mul(6.5).add(view.mul(1.8)))
        const flash = mx_noise_float(p.mul(13).add(vec3(roll.mul(2), view.x.mul(3), view.y.mul(-2))))
        const harlequin = mx_cell_noise_float(p.mul(7).add(view.mul(0.25))).smoothstep(0.35, 0.85)
        const hueA = potch.mul(4.2).add(roll.mul(3.4)).add(sheet.mul(1.8))
        const hueB = flash.mul(5).add(roll.mul(-2.2)).add(2.1)
        const hueC = harlequin.mul(3.5).add(view.z.mul(2)).add(potch.mul(2))
        const playA = spectralColor(hueA)
        const playB = cosinePalette(hueB, [0.55, 0.42, 0.5], [0.45, 0.38, 0.42], [1, 1.1, 0.9], [0, 0.33, 0.67])
        const playC = mix(color('#7cffd4'), color('#ff6ad4'), hueC.fract())
        const fire = playA.mul(0.55).add(playB.mul(0.35)).add(playC.mul(0.25)).mul(fireMask)
        const contra = fireMask.oneMinus().mul(grazing.pow(1.4))
        const pinfire = flash.smoothstep(0.55, 0.8).mul(intimate).mul(fireMask)
        this.envMapIntensity = 0.55
        this.colorNode = mix(color('#0b0a0e'), mix(color('#1a1520'), fire, 0.72), fireMask.mul(0.85).add(0.08))
        this.metalnessNode = fireMask.mul(0.35).add(0.12)
        this.roughnessNode = float(0.18).sub(fireMask.mul(0.07)).sub(pinfire.mul(0.05)).max(0.05)
        this.clearcoat = 1
        this.clearcoatRoughness = 0.025
        this.iridescence = 1
        this.iridescenceIOR = 1.48
        this.iridescenceThicknessNode = potch.mul(280).add(roll.mul(90)).add(320)
        this.normalNode = proceduralNormal(potch.mul(0.45).add(harlequin.mul(0.2)), 0.0035)
        this.emissiveNode = fire
          .mul(0.85)
          .mul(near.mul(0.45).add(0.6))
          .add(playB.mul(pinfire).mul(1.4))
          .add(playA.mul(contra).mul(0.18))
          .add(color('#1a1030').mul(rim).mul(0.1))
          .add(fire.mul(glints(normalViewGeometry, 80)).mul(0.22))
        break
      }
    }
  }
}
