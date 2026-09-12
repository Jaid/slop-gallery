import type {Node, Texture} from 'three/webgpu'

import * as tsl from 'three/tsl'
import {cameraPosition, color, cos, float, Fn, max, mix, modelWorldMatrixInverse, mx_cell_noise_float, mx_fractal_noise_float, mx_noise_float, negateOnBackSide, normalLocal, normalViewGeometry, positionGeometry, positionView, positionViewDirection, sin, time, transformNormalToView, uv, vec3, vec4} from 'three/tsl'
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

function crownFields(tube: Node<'vec2'>) {
  const u = tube.x.mul(Math.PI * 24).add(tube.y.mul(Math.PI * 8).sin().mul(0.35))
  const v = tube.y.mul(Math.PI * 8)
  const radius = u.mul(0.5).sin().abs().pow(2).add(v.mul(0.5).sin().abs().pow(2)).max(0.000_01).sqrt()
  return {
    crown: radius.sub(0.48).abs().pow(2).mul(-26).exp(),
    bowl: radius.pow(2).mul(-18).exp(),
    breath: time.mul(0.55).add(u.mul(0.25)).sin().mul(0.075).add(0.925),
  }
}
const knotCurve = Fn(([angle]: [Node<'float'>]) => {
  const phase = angle.mul(1.5)
  const radius = phase.cos().add(2).mul(0.225)
  return vec3(radius.mul(angle.cos()), radius.mul(angle.sin()), phase.sin().mul(0.225))
})
const reliefPosition = Fn(([tube]: [Node<'vec2'>]) => {
  const angle = tube.x.mul(Math.PI * 4)
  const center = knotCurve(angle)
  const next = knotCurve(angle.add(0.01))
  const tangent = next.sub(center)
  const binormal = tangent.cross(next.add(center)).normalize()
  const frameNormal = binormal.cross(tangent).normalize()
  const around = tube.y.mul(Math.PI * 2)
  const normal = frameNormal.mul(around.cos().negate()).add(binormal.mul(around.sin()))
  const p = center.add(normal.mul(0.13))
  const cameraLocal = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz
  const proximity = cameraLocal.sub(p).length().smoothstep(1, 5).oneMinus()
  const {crown, bowl, breath} = crownFields(tube)
  const height = crown.mul(0.085).mul(breath).sub(bowl.mul(0.04)).mul(proximity.mul(0.28).add(0.72))
  return p.add(normal.mul(height))
})
void reliefPosition

export const knotFinishesPremium = [
  {
    id: 'abyssal_leviathan',
    title: 'Abyssal Leviathan',
    accent: '#00ffcc',
  },
  {
    id: 'ferrofluidic_resonance',
    title: 'Ferrofluidic Resonance',
    accent: '#ff00aa',
  },
  {
    id: 'quantum_superposition',
    title: 'Quantum Superposition',
    accent: '#4facfe',
  },
  {
    id: 'cymatic_resonance',
    title: 'Cymatic Resonance',
    accent: '#d4af37',
  },
  {
    id: 'chronal_amber',
    title: 'Chronal Amber',
    accent: '#ff8c00',
  },
  {
    id: 'eventide_silk',
    title: 'Eventide Silk',
    accent: '#e94560',
  },
  {
    id: 'tesseract_projection',
    title: 'Tesseract Projection',
    accent: '#00ffcc',
  },
  {
    id: 'petrified_lightning',
    title: 'Petrified Lightning',
    accent: '#aaddff',
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
      case 'abyssal_leviathan': {
        const {p, facing, rim, intimate} = viewerFrame()
        const scalePos = p.mul(12).add(vec3(0, time.mul(0.1), 0))
        const scales = mx_fractal_noise_float(scalePos, 3, 2, 0.5).mul(0.5).add(0.5).pow(3)
        const scaleNormal = proceduralNormal(scales, 0.05)
        const iridescence = mix(color('#0a1128'), color('#1c7299'), facing.mul(scales))
        const deepGlow = mix(color('#00ffcc'), color('#ff00aa'), sin(time.mul(0.5).add(p.y.mul(3))).mul(0.5).add(0.5))
        const pulse = sin(time.mul(2).add(p.dot(vec3(1, 2, 3)).mul(5))).mul(0.5).add(0.5)
        const bioLuminescence = deepGlow.mul(pulse).mul(intimate.mul(0.8).add(0.2)).mul(scales.oneMinus())
        this.colorNode = mix(iridescence, color('#02040a'), scales)
        this.metalness = 0.4
        this.roughnessNode = scales.mul(0.3).add(0.2)
        this.normalNode = scaleNormal
        this.anisotropyNode = scales
        this.clearcoat = 0.5
        this.clearcoatRoughness = 0.1
        this.emissiveNode = bioLuminescence.mul(2.5).add(rim.mul(color('#0055ff')).mul(0.3))
        this.sheen = 1
        this.sheenRoughness = 0.4
        this.sheenNode = color('#00aaff')
        break
      }
      case 'ferrofluidic_resonance': {
        const {p, grazing, intimate} = viewerFrame()
        const noiseField = mx_fractal_noise_float(p.mul(8).add(vec3(0, time.mul(0.3), 0)), 4, 2, 0.5)
        const spikeMask = noiseField.smoothstep(0.2, 0.6)
        const spikeNormal = proceduralNormal(noiseField, 0.15)
        const baseColor = color('#050505')
        const tipColor = cosinePalette(noiseField.mul(2), [0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [1, 1, 1], [0, 0.33, 0.67])
        this.colorNode = mix(baseColor, tipColor, spikeMask.mul(0.6))
        this.metalness = 1
        this.roughnessNode = spikeMask.oneMinus().mul(0.05).add(0.01)
        this.normalNode = spikeNormal
        this.envMapIntensity = 1.5
        this.clearcoat = 0.3
        this.clearcoatRoughness = 0.05
        this.emissiveNode = tipColor.mul(spikeMask).mul(grazing.pow(3)).mul(intimate.mul(0.5).add(0.5)).mul(0.8)
        break
      }
      case 'quantum_superposition': {
        const {p, intimate} = viewerFrame()
        const cloudNoise = mx_fractal_noise_float(p.mul(4).add(time.mul(0.2)), 3, 2, 0.5).mul(0.5).add(0.5)
        const cloudDensity = cloudNoise.smoothstep(0.3, 0.7)
        const collapse = intimate
        const cloudColor = mix(color('#4facfe'), color('#00f2fe'), cloudNoise)
        const cloudEmissive = cloudColor.mul(cloudDensity).mul(3)
        const chromeColor = color('#ffffff')
        this.colorNode = mix(cloudColor, chromeColor, collapse)
        this.metalnessNode = collapse
        this.roughnessNode = mix(1, 0, collapse)
        // The source alpha/transmission combination triggers a Tint swizzle-lowering bug;
        // retain the cloud-to-chrome collapse through surface response instead.
        this.clearcoatNode = collapse.mul(0.8)
        this.clearcoatRoughnessNode = collapse.mul(0.06).add(0.18)
        this.side = DoubleSide
        this.emissiveNode = cloudEmissive.mul(collapse.oneMinus())
        break
      }
      case 'cymatic_resonance': {
        const {p, intimate} = viewerFrame()
        const t = time.mul(0.15)
        const freq1 = 3; const freq2 = 4; const freq3 = 5
        const wave1 = sin(p.x.mul(freq1).add(t))
        const wave2 = sin(p.y.mul(freq2).add(t.mul(1.3)))
        const wave3 = sin(p.z.mul(freq3).add(t.mul(0.7)))
        const interference = wave1.add(wave2).add(wave3).div(3)
        const sandMask = float(1).sub(interference.abs().smoothstep(0, 0.05)).pow(2)
        const sandNormal = proceduralNormal(sandMask, 0.02)
        const baseColor = mix(color('#2a1610'), color('#4a2a18'), mx_noise_float(p.mul(20)))
        const sandColor = color('#d4af37')
        this.colorNode = mix(baseColor, sandColor, sandMask)
        this.metalnessNode = sandMask.mul(0.8)
        this.roughnessNode = mix(0.8, 0.3, sandMask)
        this.normalNode = sandNormal
        this.emissiveNode = sandColor.mul(sandMask).mul(intimate.mul(0.8).add(0.2)).mul(1.5)
        this.clearcoat = 0.2
        this.clearcoatRoughness = 0.4
        break
      }
      case 'chronal_amber': {
        const {p, rim} = viewerFrame()
        const drift = vec3(time.mul(0.02), time.mul(-0.015), time.mul(0.01))
        const inclusionNoise = mx_fractal_noise_float(p.mul(3).add(drift), 4, 2, 0.5)
        const inclusion = inclusionNoise.smoothstep(0.1, 0.5)
        const coreGlow = inclusion.mul(sin(time.mul(0.5)).mul(0.2).add(0.8))
        this.colorNode = color('#ff8c00')
        this.transmission = 0.95
        this.thicknessNode = inclusion.mul(2).add(0.5)
        this.ior = 1.55
        this.attenuationColor.set('#8b4500')
        this.attenuationDistance = 0.8
        this.roughness = 0.05
        this.metalness = 0
        this.dispersion = 0.4
        this.clearcoat = 1
        this.clearcoatRoughness = 0.02
        this.normalNode = proceduralNormal(mx_noise_float(p.mul(40)), 0.005)
        this.emissiveNode = color('#ffaa00').mul(coreGlow).mul(2).add(rim.mul(color('#ff4400')).mul(0.4))
        break
      }
      case 'eventide_silk': {
        const {p, intimate} = viewerFrame()
        const tube = uv()
        const warp = sin(tube.x.mul(300)).abs().pow(10)
        const weft = sin(tube.y.mul(300)).abs().pow(10)
        const weave = max(warp, weft)
        const starNoise = mx_cell_noise_float(p.mul(50))
        const stars = starNoise.smoothstep(0.95, 0.98)
        const threadColor = mix(color('#1a1a2e'), color('#e94560'), stars)
        this.colorNode = color('#05050a')
        this.metalness = 0.1
        this.roughness = 0.8
        this.sheen = 1
        this.sheenRoughnessNode = weave.mul(0.2).add(0.1)
        this.sheenNode = threadColor
        this.anisotropyNode = weave
        this.emissiveNode = threadColor.mul(weave).mul(3).mul(intimate.mul(0.6).add(0.4)).add(color('#ffffff').mul(stars).mul(5))
        this.normalNode = proceduralNormal(weave, 0.01)
        break
      }
      case 'tesseract_projection': {
        const {p, intimate} = viewerFrame()
        const t = time.mul(0.3)
        const q = p.mul(4)
        const rotX = q.x.mul(cos(t)).sub(q.y.mul(sin(t)))
        const rotY = q.x.mul(sin(t)).add(q.y.mul(cos(t)))
        const rotZ = q.z.mul(cos(t.mul(0.7))).sub(q.x.mul(sin(t.mul(0.7))))
        const gridX = sin(rotX.mul(Math.PI * 2)).abs().pow(20)
        const gridY = sin(rotY.mul(Math.PI * 2)).abs().pow(20)
        const gridZ = sin(rotZ.mul(Math.PI * 2)).abs().pow(20)
        const grid = max(gridX, max(gridY, gridZ))
        const intersection = gridX.mul(gridY).mul(gridZ).pow(0.33)
        const gridColor = mix(color('#00ffcc'), color('#ff00ff'), intersection)
        this.colorNode = color('#0a0a0a')
        this.metalness = 0.2
        this.roughness = 0.9
        this.emissiveNode = gridColor.mul(grid).mul(4).mul(intimate.mul(0.5).add(0.5)).add(color('#ffffff').mul(intersection).mul(10))
        this.normalNode = proceduralNormal(grid, 0.008)
        this.clearcoat = 0.5
        this.clearcoatRoughness = 0.3
        break
      }
      case 'petrified_lightning': {
        const {p, intimate} = viewerFrame()
        const surfaceNoise = mx_fractal_noise_float(p.mul(20), 3, 2, 0.5)
        const surfaceRoughness = surfaceNoise.mul(0.4).add(0.3)
        const lightningNoise = mx_fractal_noise_float(p.mul(8).add(vec3(0, 0, time.mul(0.1))), 5, 2.5, 0.5)
        const veins = lightningNoise.smoothstep(0.45, 0.48).pow(3)
        const flash = sin(time.mul(15).add(p.y.mul(10))).pow(20).mul(intimate)
        const veinColor = mix(color('#aaddff'), color('#ffffff'), flash)
        this.colorNode = color('#a8b2c1')
        this.transmission = 0.85
        this.thicknessNode = veins.mul(1.5).add(0.5)
        this.ior = 1.45
        this.roughnessNode = surfaceRoughness
        this.metalness = 0
        this.attenuationColor.set('#4a5a7a')
        this.attenuationDistance = 1.2
        this.normalNode = proceduralNormal(surfaceNoise, 0.03)
        this.emissiveNode = veinColor.mul(veins).mul(5).add(color('#ffffff').mul(flash).mul(8))
        this.clearcoat = 0.8
        this.clearcoatRoughness = 0.2
        break
      }
    }
  }
}
