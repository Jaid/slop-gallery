import type {Node, Texture} from 'three/webgpu'

import * as tsl from 'three/tsl'
import {cameraPosition, color, float, mix, modelWorldMatrixInverse, mx_cell_noise_float, mx_fractal_noise_float, mx_noise_float, mx_worley_noise_float, negateOnBackSide, normalLocal, normalViewGeometry, positionGeometry, positionLocal, positionView, positionViewDirection, time, transformNormalToView, uv, vec3, vec4} from 'three/tsl'
import {MeshPhysicalNodeMaterial} from 'three/webgpu'

// --- shared helpers (same signatures as original) ---

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
export function starfield(direction: Node<'vec3'>, scale: number, threshold: number) {
  const q = direction.mul(scale)
  const rnd = cellNoiseVec3(q)
  const rnd2 = cellNoiseVec3(q.add(31.7))
  const centre = rnd.mul(0.6).add(0.2)
  const dist = q.fract().sub(centre).length()
  const footprint = q.fwidth().length().max(0.001)
  const radius = footprint.mul(0.9).max(0.06)
  const core = dist.smoothstep(0, radius).oneMinus()
  const gate = rnd2.x.smoothstep(threshold, threshold + 0.01)
  const twinkle = time.mul(rnd2.y.mul(4).add(1.5)).add(rnd2.z.mul(30)).sin().mul(0.35).add(0.75)
  const tint = mix(color('#ffd9b0'), color('#b8d4ff'), rnd2.z)
  const energy = footprint.smoothstep(0.3, 1.2).oneMinus()
  return tint.mul(core.abs().pow(2)).mul(gate).mul(twinkle).mul(energy)
}
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

// --- premium catalog ---

export const knotFinishes = [
  {
    id: 'aether_loom',
    title: 'Aether Loom',
    accent: '#c8f1ff',
  },
  {
    id: 'mnemonic_mercury',
    title: 'Mnemonic Mercury',
    accent: '#e6f0f5',
  },
  {
    id: 'nocturne_opal',
    title: 'Nocturne Opal',
    accent: '#8a6cff',
  },
  {
    id: 'pallid_chrysalis',
    title: 'Pallid Chrysalis',
    accent: '#ffb08a',
  },
  {
    id: 'cinder_codex',
    title: 'Cinder Codex',
    accent: '#ff6a00',
  },
  {
    id: 'kairothic_frost',
    title: 'Kairothic Frost',
    accent: '#a8e6ff',
  },
  {
    id: 'cathedral_lightning',
    title: 'Cathedral Lightning',
    accent: '#7af0ff',
  },
  {
    id: 'lichen_cathedral',
    title: 'Lichen Cathedral',
    accent: '#2aff7a',
  },
] as const

export type KnotFinish = typeof knotFinishes[number]['id']

export class KnotMaterial extends MeshPhysicalNodeMaterial {
  constructor(finish: KnotFinish, environment: Texture) {
    super({
      envMap: environment,
      envMapIntensity: 0.9,
    })
    this.name = finish
    switch (finish) {
      case 'aether_loom': {
        // Woven light - black velvet that only reveals luminous warp/weft at grazing and up close
        const {p, facing, rim, near} = viewerFrame()
        const tube = uv()
        const jitterA = mx_noise_float(p.mul(1.8)).mul(0.4)
        const jitterB = mx_noise_float(p.mul(1.8).add(vec3(5, 1, 3))).mul(0.4)
        const warpPhase = tube.x.mul(64).add(jitterA)
        const weftPhase = tube.y.mul(32).add(jitterB)
        const warpLine = opticalLine(warpPhase.fract().sub(0.5), 0.032)
        const weftLine = opticalLine(weftPhase.fract().sub(0.5), 0.038)
        const weave = warpLine.max(weftLine)
        const threadTint = spectralColor(tube.x.mul(8).add(time.mul(0.12)).add(tube.y.mul(2)))
        const threadTint2 = spectralColor(tube.x.mul(8).add(2.5).add(time.mul(0.12)))
        const velvet = color('#06070a')
        const reveal = weave.mul(near.mul(0.6).add(0.35)).mul(facing.oneMinus().pow(0.7).add(0.3))
        this.colorNode = mix(velvet, threadTint, reveal)
        this.roughnessNode = float(0.92).sub(weave.mul(0.55))
        this.metalnessNode = float(0)
        this.emissiveNode = threadTint.mul(warpLine).mul(near.mul(0.7).add(0.5)).mul(1.3)
          .add(threadTint2.mul(weftLine).mul(0.9))
          .add(color('#ffffff').mul(rim.pow(3).mul(weave).mul(0.18)))
        this.clearcoat = 0.15
        this.clearcoatRoughness = 0.6
        this.iridescence = 0.7
        this.iridescenceIOR = 1.8
        this.iridescenceThicknessNode = facing.mul(120).add(260).add(weave.mul(80))
        this.normalNode = proceduralNormal(weave.mul(0.5), 0.0008)
        this.envMapIntensity = 0.25
        break
      }
      case 'mnemonic_mercury': {
        // Liquid mirror that remembers - perfect chrome with memory droplets and fingerprint whorls when intimate
        const {p, grazing, rim, near, intimate} = viewerFrame()
        const baseSilver = color('#e8eef2')
        const flow = mx_fractal_noise_float(p.mul(1.15).add(vec3(time.mul(0.07), float(0), time.mul(0.04))), 3, 2, 0.55).mul(0.5).add(0.5)
        const mercuryNormal = liquidNormal(near.mul(0.4).add(0.3), 0.9)
        const cell = cellNoiseVec3(p.mul(38))
        const beadThresh = float(0.86).sub(intimate.mul(0.18))
        const bead = cell.x.smoothstep(beadThresh, beadThresh.add(0.035))
        const beadShape = p.mul(38).fract().sub(cell.mul(0.4).add(0.3)).length().smoothstep(0.28, 0.42).oneMinus()
        const droplets = bead.mul(beadShape).mul(intimate)
        const fingerprint = opticalLine(uv().x.mul(80).add(uv().y.mul(10).sin().mul(3)).fract().sub(0.5), 0.02).mul(intimate).mul(0.55)
        this.colorNode = mix(color('#d8e2e8'), baseSilver, flow)
        this.metalness = 1
        this.roughnessNode = float(0.04).add(droplets.mul(0.18)).add(grazing.mul(0.06))
        this.clearcoat = 1
        this.clearcoatRoughness = 0.02
        this.normalNode = mercuryNormal.add(proceduralNormal(droplets.add(fingerprint).mul(0.9), 0.0025))
        this.emissiveNode = color('#aee8ff').mul(rim.pow(4).mul(0.12))
        this.envMapIntensity = 1.45
        this.ior = 1.8
        break
      }
      case 'nocturne_opal': {
        // Black opal with true parallax fire - pockets swim opposite to view
        const {p, view, facing, rim, near} = viewerFrame()
        const inner = p.sub(view.mul(0.21))
        const deep = p.sub(view.mul(0.44))
        const deeper = p.sub(view.mul(0.62))
        const drift = vec3(time.mul(0.02), time.mul(-0.015), time.mul(0.011))
        const pocketA = mx_noise_float(inner.mul(3.1).add(drift))
        const pocketB = mx_noise_float(deep.mul(4.2).sub(drift.mul(1.3)))
        const pocketC = mx_fractal_noise_float(deeper.mul(2.8).add(drift.mul(0.7)), 2, 2, 0.5)
        const fireField = pocketA.add(pocketB.mul(0.7)).add(pocketC.mul(0.5))
        const fireMask = fireField.smoothstep(0.2, 0.85)
        const hue = fireField.mul(1.4).add(view.x.mul(0.4)).add(time.mul(0.03))
        const opalTint = cosinePalette(hue, [0.55, 0.45, 0.6], [0.45, 0.35, 0.45], [1, 1, 1], [0.02, 0.15, 0.33])
        const flecks = mx_cell_noise_float(p.mul(42)).pow(3).mul(8).clamp()
        const fleckMask = flecks.mul(fireMask).mul(near.mul(0.6).add(0.4))
        const parallax = facing.pow(0.8)
        this.colorNode = color('#06070c')
        this.metalness = 0.05
        this.roughness = 0.12
        this.transmission = 0.28
        this.thickness = 0.65
        this.ior = 1.45
        this.attenuationColor.set('#0a0a1a')
        this.attenuationDistance = 0.7
        this.iridescence = 1
        this.iridescenceIOR = 2.2
        this.iridescenceThicknessNode = fireField.mul(180).add(280).add(facing.mul(120))
        this.clearcoat = 1
        this.clearcoatRoughness = 0.06
        this.normalNode = proceduralNormal(fireField.mul(0.6).add(flecks.mul(0.3)), 0.0012)
        this.emissiveNode = opalTint.mul(fireMask).mul(parallax.mul(1.2).add(0.2)).mul(near.mul(0.6).add(0.5))
          .add(opalTint.mul(fleckMask).mul(2.2))
          .add(color('#9aa8ff').mul(rim).mul(0.12))
        this.envMapIntensity = 0.6
        break
      }
      case 'pallid_chrysalis': {
        // Living pupa - translucent skin, vein network, slow pulse + heartbeat
        const {p, grazing, rim, near} = viewerFrame()
        const pulse = time.mul(0.9).sin().mul(0.5).add(0.5)
        const heartbeat = time.mul(1.7).sin().mul(0.5).add(0.5).pow(6)
        const organic = p.mul(2.2)
        const worley = mx_worley_noise_float(organic.add(vec3(time.mul(0.03), float(0), float(0))))
        const worley2 = mx_worley_noise_float(organic.mul(1.7).add(vec3(2.3, 1.1, 4.5)))
        const veinField = worley.oneMinus().pow(2.5)
        const veinMask = veinField.smoothstep(0.55, 0.82)
        const fineVein = opticalLine(worley2.sub(0.5), 0.04).mul(0.8)
        const membrane = mx_noise_float(p.mul(1.5)).mul(0.3).add(0.7)
        const skinBase = mix(color('#e8e0c8'), color('#d8c6a8'), membrane)
        const bloodTint = mix(color('#ff8a6a'), color('#ff2a4a'), heartbeat)
        this.colorNode = mix(skinBase, color('#f2e6d0'), veinMask.mul(0.15).oneMinus())
        this.transmission = 0.68
        this.thickness = 0.45
        this.ior = 1.38
        this.attenuationColor.set('#ffe9c7')
        this.attenuationDistance = 0.35
        this.roughnessNode = float(0.38).sub(veinMask.mul(0.15)).add(grazing.mul(0.12))
        this.metalness = 0
        this.clearcoat = 0.35
        this.clearcoatRoughness = 0.28
        this.normalNode = liquidNormal(near.mul(0.3).add(0.2), 0.35)
          .add(proceduralNormal(veinMask.mul(0.7).add(fineVein.mul(0.5)), 0.001))
        this.emissiveNode = bloodTint.mul(veinMask).mul(pulse.mul(0.4).add(0.4)).mul(0.6)
          .add(color('#ff9a5a').mul(fineVein).mul(heartbeat).mul(0.9))
          .add(color('#aaffd0').mul(rim.pow(2).mul(0.12)))
        this.envMapIntensity = 0.35
        break
      }
      case 'cinder_codex': {
        // Obsidian with molten gold kintsugi - cracks breathe heat
        const {p, facing, rim, near} = viewerFrame()
        const heatPulse = time.mul(1.1).sin().mul(0.3).add(0.7)
        const baseNoise = mx_noise_float(p.mul(2.2))
        const worleyLarge = mx_worley_noise_float(p.mul(5.5))
        const worleySmall = mx_worley_noise_float(p.mul(18).add(vec3(4.2, 1.3, 2.8)))
        const crackLarge = worleyLarge.smoothstep(0.78, 0.92)
        const crackSmall = worleySmall.smoothstep(0.72, 0.88)
        const crackMask = crackLarge.max(crackSmall.mul(0.6))
        const crackCore = worleyLarge.smoothstep(0.86, 0.9).add(worleySmall.smoothstep(0.82, 0.86).mul(0.5))
        const flow = mx_noise_float(p.mul(3).add(vec3(time.mul(0.2), float(0), float(0)))).mul(0.5).add(0.5)
        const moltenGold = mix(color('#ff6a00'), color('#ffd700'), flow)
        const ember = mix(color('#ff1a00'), color('#ffcc66'), flow)
        const obsidian = mix(color('#08080a'), color('#1a1a1e'), baseNoise.mul(0.2).add(facing.mul(0.2)))
        this.colorNode = mix(obsidian, moltenGold, crackMask)
        this.metalnessNode = crackMask.mul(0.85).add(0.05)
        this.roughnessNode = float(0.08).mix(0.75, crackMask.oneMinus()).add(crackMask.mul(0.05))
        this.clearcoat = 0.6
        this.clearcoatRoughness = 0.12
        this.normalNode = proceduralNormal(crackMask.mul(1.2).add(baseNoise.mul(0.2)), 0.0015)
        this.emissiveNode = moltenGold.mul(crackCore).mul(heatPulse).mul(1.8)
          .add(ember.mul(crackMask).mul(0.4))
          .add(color('#ff4d00').mul(rim.pow(3).mul(crackMask).mul(0.25)))
          .mul(near.mul(0.5).add(0.5))
        this.envMapIntensity = 0.5
        break
      }
      case 'kairothic_frost': {
        // Ice that grows as you look - feathered dendrites resolve only when intimate
        const {p, facing, rim, near, intimate} = viewerFrame()
        const tube = uv()
        const drift = time.mul(0.04)
        const frostNoise = mx_fractal_noise_float(p.mul(4.5).add(vec3(drift, float(0), float(0))), 3, 2, 0.6)
        const frostThresh = float(0.35).add(time.mul(0.08).sin().mul(0.12)).sub(near.mul(0.15))
        const frostMask = frostNoise.smoothstep(frostThresh, frostThresh.add(0.18))
        const dendriteDir = tube.x.mul(40).add(tube.y.mul(8))
        const dendrite = opticalLine(dendriteDir.fract().sub(0.5), 0.04).mul(frostMask)
        const feather = opticalLine(tube.x.mul(120).add(tube.y.mul(24).sin().mul(2)).fract().sub(0.5), 0.025).mul(frostMask).mul(intimate)
        const sparkleCell = cellNoiseVec3(p.mul(62).add(vec3(0, time.mul(0.5), 0)))
        const sparkle = sparkleCell.x.smoothstep(0.92, 0.96).mul(frostMask).mul(near)
        this.positionNode = positionLocal.add(normalLocal.mul(frostMask.mul(0.018).mul(near)))
        this.colorNode = mix(mix(color('#e6f3ff'), color('#ffffff'), frostMask.mul(0.85)), color('#7ab8ff'), facing.oneMinus().mul(0.35))
        this.transmission = 0.92
        this.thickness = 0.8
        this.ior = 1.31
        this.attenuationColor.set('#b3d9ff')
        this.attenuationDistance = 0.6
        this.roughnessNode = float(0.04).add(frostMask.mul(0.42))
        this.metalness = 0
        this.clearcoat = 1
        this.clearcoatRoughness = 0.06
        this.iridescence = 0.8
        this.iridescenceIOR = 1.3
        this.iridescenceThicknessNode = frostMask.mul(180).add(320)
        this.normalNode = proceduralNormal(frostMask.mul(0.6).add(dendrite.mul(0.4)), 0.001)
        this.emissiveNode = color('#a8e6ff').mul(sparkle).mul(1.2)
          .add(color('#ffffff').mul(dendrite.add(feather)).mul(0.15).mul(glints(normalViewGeometry, 60)))
          .add(color('#7ac8ff').mul(rim.pow(4).mul(frostMask).mul(0.12)))
        this.envMapIntensity = 0.8
        break
      }
      case 'cathedral_lightning': {
        // Clear quartz trapping a storm that seeks the viewer - random strikes with exponential decay
        const {p, view, rim, near} = viewerFrame()
        const tick = time.mul(6.5).floor()
        const tickFract = time.mul(6.5).fract()
        const jitter = cellNoiseVec3(vec3(tick.mul(0.31), tick.mul(0.47), float(2.1)))
        const strikeChance = jitter.x.smoothstep(0.68, 0.84)
        const inner = p.sub(view.mul(0.18))
        const stormField = mx_fractal_noise_float(inner.mul(3.2).add(vec3(time.mul(0.3), float(0), float(0))), 3, 2, 0.5)
        const stormField2 = mx_noise_float(inner.mul(7.5).add(time.mul(0.6)))
        const trunk = filament(stormField.sub(0.15), 0.03)
        const branches = filament(stormField2.sub(0.1), 0.018).mul(0.7)
        const lightningMask = trunk.max(branches).mul(strikeChance)
        const flash = tickFract.oneMinus().pow(3).mul(strikeChance).add(strikeChance.mul(0.15))
        this.colorNode = color('#eaf4ff')
        this.transmission = 0.96
        this.thickness = 0.75
        this.ior = 1.54
        this.dispersion = 0.12
        this.attenuationColor.set('#d0e8ff')
        this.attenuationDistance = 0.9
        this.roughness = 0.015
        this.metalness = 0
        this.clearcoat = 1
        this.clearcoatRoughness = 0.02
        this.normalNode = proceduralNormal(stormField.mul(0.2), 0.0008)
        this.emissiveNode = mix(color('#5af2ff'), color('#b56dff'), stormField2.mul(0.5).add(0.5)).mul(lightningMask).mul(flash).mul(6)
          .add(color('#ffffff').mul(lightningMask).mul(flash).mul(2.5).mul(near.mul(0.5).add(0.5)))
          .add(color('#7aa8ff').mul(rim.pow(5).mul(0.2)))
        this.envMapIntensity = 0.7
        break
      }
      case 'lichen_cathedral': {
        // Ancient granite breathing with bioluminescent lichen - hyper detail up close
        const {p, rim, near} = viewerFrame()
        const stoneNoise = mx_fractal_noise_float(p.mul(1.8), 3, 2, 0.55)
        const stoneColor = mix(color('#2a2e2d'), color('#3d4440'), stoneNoise.mul(0.5).add(0.5))
        const worley = mx_worley_noise_float(p.mul(6.2))
        const shelterMask = worley.oneMinus().smoothstep(0.35, 0.75)
        const lichenNoise = mx_noise_float(p.mul(4.5))
        const lichenBaseMask = lichenNoise.smoothstep(0.25, 0.65).mul(shelterMask)
        const detailLichen = mx_noise_float(p.mul(22)).mul(lichenBaseMask)
        const breath = time.mul(0.35).sin().mul(0.15).add(0.85)
        const lichenTint1 = color('#2aff7a')
        const lichenTint2 = color('#a0ff66')
        const fruiting = color('#ffe066')
        const lichenColor = mix(lichenTint1, lichenTint2, mx_noise_float(p.mul(8)).mul(0.5).add(0.5))
        const fruitMask = mx_cell_noise_float(p.mul(28)).smoothstep(0.88, 0.93).mul(lichenBaseMask)
        this.positionNode = positionLocal.add(normalLocal.mul(lichenBaseMask.mul(0.025).mul(near).mul(detailLichen.mul(0.5).add(0.5))))
        this.colorNode = mix(stoneColor, lichenColor, lichenBaseMask.mul(0.85)).add(fruiting.mul(fruitMask).mul(0.6))
        this.roughnessNode = float(0.85).sub(lichenBaseMask.mul(0.45)).add(detailLichen.mul(0.1))
        this.metalness = 0
        this.clearcoat = 0.1
        this.clearcoatRoughness = 0.8
        this.normalNode = proceduralNormal(stoneNoise.mul(0.5).add(detailLichen.mul(lichenBaseMask).mul(0.8)), 0.0012)
        this.emissiveNode = lichenColor.mul(lichenBaseMask).mul(breath).mul(0.35)
          .add(fruiting.mul(fruitMask).mul(breath).mul(0.9))
          .add(lichenTint1.mul(rim.pow(2).mul(lichenBaseMask).mul(0.18)))
          .mul(near.mul(0.6).add(0.4))
        this.envMapIntensity = 0.4
        break
      }
    }
  }
}
