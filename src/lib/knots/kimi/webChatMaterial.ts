import type {Node, Texture} from 'three/webgpu'

import * as tsl from 'three/tsl'
import {cameraPosition, color, float, mix, modelWorldMatrixInverse, mx_cell_noise_float, mx_fractal_noise_float, mx_noise_float, mx_worley_noise_float, negateOnBackSide, normalLocal, normalViewGeometry, positionGeometry, positionView, positionViewDirection, time, transformNormalToView, uv, vec2, vec3, vec4} from 'three/tsl'
import {MeshPhysicalNodeMaterial} from 'three/webgpu'

export function spectralColor(phase: Node<'float'>) {
  return vec3(phase, phase.add(2.0944), phase.add(4.1888)).cos().mul(0.46).add(0.54)
}
export function filament(field: Node<'float'>, width: number) {
  return field.abs().smoothstep(width, field.fwidth().mul(1.2).max(0.0001).add(width)).oneMinus()
}
export function opticalLine(field: Node<'float'>, width: number) {
  const footprint = field.fwidth().max(0.0001)
  return field.abs().smoothstep(width, footprint.mul(1.25).add(width)).oneMinus().mul(footprint.smoothstep(width * 3, width * 12).oneMinus())
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
export type Triple = [
  number,
  number,
  number,
]
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

export const knotFinishesPremium = [
  {
    id: 'aurora_veil',
    title: 'Aurora Veil',
    accent: '#5ff2b0',
  },
  {
    id: 'magma_heart',
    title: 'Magma Heart',
    accent: '#ff4d00',
  },
  {
    id: 'celadon_crackle',
    title: 'Celadon Crackle',
    accent: '#b7e3cd',
  },
  {
    id: 'abyssal_drift',
    title: 'Abyssal Drift',
    accent: '#46a0ff',
  },
  {
    id: 'quantum_circuit',
    title: 'Quantum Circuit',
    accent: '#ffd76a',
  },
  {
    id: 'ferrofluid_crown',
    title: 'Ferrofluid Crown',
    accent: '#6f7dff',
  },
  {
    id: 'harlequin_opal',
    title: 'Harlequin Opal',
    accent: '#ffb3ec',
  },
  {
    id: 'runic_monolith',
    title: 'Runic Monolith',
    accent: '#43ffd0',
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
      case 'aurora_veil': {
                // polar night glass; aurora curtains hang inside, hue follows your orbit
        this.envMapIntensity = 0.8
        this.transmission = 0.88
        this.thickness = 0.55
        this.ior = 1.32
        this.dispersion = 0.18
        this.attenuationColor.set('#0b2f4a')
        this.attenuationDistance = 0.45
        this.roughness = 0.04
        this.metalness = 0
        this.clearcoat = 1
        this.clearcoatRoughness = 0.03
        const {p, view, grazing, rim, near, intimate} = viewerFrame()
        const tube = uv()
        const shallow = p.sub(view.mul(0.1))
        const deep = p.sub(view.mul(0.26))
        const curtain = (q: Node<'vec3'>, freq: number, speed: number) => {
          const warp = mx_fractal_noise_float(q.mul(2.4), 3, 2, 0.5).mul(2.2)
          return q.y.mul(freq).add(warp).add(time.mul(speed)).sin().mul(0.5).add(0.5).pow(2)
        }
        const bandA = curtain(shallow, 9, 0.1)
        const bandB = curtain(deep, 6, -0.07)
        const rays = opticalBands(tube.x.mul(140).add(mx_noise_float(p.mul(4)).mul(6))).mul(intimate.mul(0.7).add(0.3))
        const hue = bandA.mul(1.2).add(view.x.mul(1.5)).add(view.y).add(time.mul(0.05))
        const aurora = cosinePalette(hue, [0.12, 0.5, 0.4], [0.3, 0.32, 0.38], [1, 1, 1], [0.55, 0, 0.3])
        this.colorNode = color('#030d1a')
        this.normalNode = proceduralNormal(mx_noise_float(p.mul(3).add(time.mul(0.05))), 0.0018)
        this.emissiveNode = aurora.mul(bandA.mul(0.9).add(bandB.mul(0.6))).mul(rays.mul(0.6).add(0.55)).mul(near.mul(0.7).add(0.45))
          .add(color('#59f2c0').mul(rim).mul(0.22))
          .add(color('#b47bff').mul(grazing.pow(3)).mul(0.15))
        break
      }
      case 'magma_heart': {
                // obsidian crust over a molten core; veins beat like a heart, hotter as you approach
        this.envMapIntensity = 0.5
        const {p, view, rim, near, intimate} = viewerFrame()
        const shallow = p.sub(view.mul(0.05))
        const crust = mx_fractal_noise_float(p.mul(7), 4, 2, 0.5)
        const crackFieldA = mx_fractal_noise_float(shallow.mul(5.5), 3, 2, 0.55)
        const crackFieldB = mx_fractal_noise_float(shallow.mul(11).add(vec3(7.3, 1.1, 4.9)), 2, 2, 0.5)
        const cracksWide = filament(crackFieldA, 0.1)
        const cracksFine = filament(crackFieldB, 0.045).mul(intimate.mul(0.8).add(0.2))
        const crackMask = cracksWide.max(cracksFine).clamp()
        const beat = time.mul(1.6).fract()
        const thump = beat.mul(-14).exp().add(beat.sub(0.22).abs().mul(-30).exp().mul(0.6))
        const heat = thump.mul(0.8).add(0.6).add(near.mul(0.35))
        const deepGlow = mx_noise_float(p.sub(view.mul(0.2)).mul(4)).mul(0.5).add(0.5)
        const lava = mix(color('#ff2d00'), color('#ffc23d'), cracksWide.pow(2).mul(heat).add(deepGlow.mul(0.3)).clamp())
        const embers = mx_cell_noise_float(p.mul(90).add(vec3(0, time.mul(0.35), 0))).smoothstep(0.985, 0.995).mul(intimate)
        this.colorNode = mix(color('#0b0909'), color('#2b1d18'), crust.mul(0.5).add(0.5).pow(2))
        this.metalness = 0
        this.roughnessNode = crust.mul(0.5).add(0.5).mul(0.35).add(0.55).sub(crackMask.mul(0.3)).clamp()
        this.clearcoat = 0.15
        this.clearcoatRoughness = 0.5
        this.normalNode = proceduralNormal(crackFieldA.mul(0.6).add(crust.mul(0.4)), 0.0028)
        this.emissiveNode = lava.mul(crackMask).mul(heat.mul(1.6))
          .add(lava.mul(cracksWide.pow(0.6)).mul(0.25))
          .add(color('#ff5a1e').mul(rim).mul(0.1))
          .add(color('#ffcf7a').mul(embers).mul(1.2))
        break
      }
      case 'celadon_crackle': {
                // Song-dynasty celadon; golden threads always present, iron-wire crackle revealed up close
        this.envMapIntensity = 1
        const {p, grazing, rim, near, intimate} = viewerFrame()
        const mottle = mx_fractal_noise_float(p.mul(3.2), 3, 2, 0.5).mul(0.5).add(0.5)
        const coarse = mx_fractal_noise_float(p.mul(14), 2, 2, 0.5)
        const fine = mx_fractal_noise_float(p.mul(34).add(vec3(3.1, 8.7, 5.3)), 2, 2, 0.5)
        const goldThread = filament(coarse, 0.02)
        const ironWire = filament(fine, 0.012).mul(intimate.mul(0.85).add(0.15))
        const glaze = mix(mix(color('#9dbfa8'), color('#cfe6d4'), mottle), color('#7ba88f'), grazing.pow(2).mul(0.4))
        this.colorNode = mix(mix(glaze, color('#6b5636'), goldThread.mul(0.5)), color('#2e2318'), ironWire.mul(0.65))
        this.roughnessNode = goldThread.max(ironWire).mul(0.3).add(mottle.mul(0.08)).add(0.16)
        this.clearcoat = 1
        this.clearcoatRoughness = 0.05
        this.transmission = 0.12
        this.thickness = 0.3
        this.attenuationColor.set('#9fd8b8')
        this.attenuationDistance = 0.8
        this.sheen = 0.4
        this.sheenColor.set('#eafff2')
        this.sheenRoughness = 0.5
        this.normalNode = proceduralNormal(coarse.mul(0.5).add(mx_noise_float(p.mul(6)).mul(0.3)), 0.0008)
        this.emissiveNode = color('#3d6b52').mul(rim).mul(0.1)
          .add(color('#c9a24e').mul(goldThread).mul(glints(normalViewGeometry, 60)).mul(0.35).mul(near.mul(0.5).add(0.5)))
        break
      }
      case 'abyssal_drift': {
                // hadal creature; light organs pulse along the body, alarm-quickening when you come close
        this.envMapIntensity = 0.7
        this.transmission = 0.85
        this.thickness = 0.5
        this.ior = 1.28
        this.dispersion = 0.22
        this.attenuationColor.set('#02122e')
        this.attenuationDistance = 0.35
        this.roughness = 0.06
        this.metalness = 0
        this.clearcoat = 1
        this.clearcoatRoughness = 0.02
        const {p, rim, near, intimate} = viewerFrame()
        const tube = uv()
        const rate = intimate.mul(2.2).add(0.9)
        const wave = tube.x.mul(Math.PI * 6).sub(time.mul(rate)).sin().mul(0.5).add(0.5).pow(6)
        const rings = opticalLine(tube.y.mul(18).fract().sub(0.5), 0.06)
        const cells = cellNoiseVec3(vec3(tube.x.mul(90).floor(), tube.y.mul(18).floor(), 2.7))
        const organs = rings.mul(cells.x.smoothstep(0.55, 0.7))
        const shimmer = mx_noise_float(p.mul(24).add(vec3(0, time.mul(0.5), 0))).mul(0.5).add(0.5)
        const bio = mix(color('#1b6dff'), color('#54f2ff'), wave)
        const alarm = mix(bio, color('#9a6bff'), intimate.mul(0.5))
        this.colorNode = color('#020a18')
        this.normalNode = liquidNormal(near, 0.1)
        this.emissiveNode = alarm.mul(organs.mul(0.85).add(wave.mul(0.3))).mul(near.mul(0.75).add(0.35))
          .add(color('#7a4dff').mul(rim).mul(0.25))
          .add(color('#9ff7ff').mul(shimmer.pow(8)).mul(intimate).mul(0.8))
        break
      }
      case 'quantum_circuit': {
                // matte silicon etched with gold; data pulses race the buses, fine logic fades in up close
        this.envMapIntensity = 1.1
        const {p, rim, near, intimate} = viewerFrame()
        const tube = uv()
        const col = tube.x.mul(36).floor()
        const row = tube.y.mul(8).floor()
        const cellRnd = cellNoiseVec3(vec3(col, row, 1.3))
        const localX = tube.x.mul(36).fract()
        const localY = tube.y.mul(8).fract()
        const bus = opticalLine(localY.sub(0.5), 0.05)
        const jumper = opticalLine(localX.sub(cellRnd.y), 0.05).mul(cellRnd.x.smoothstep(0.62, 0.68)).mul(bus.oneMinus())
        const pad = vec2(localX.sub(cellRnd.y), localY.sub(0.5)).length().smoothstep(0.1, 0.16).oneMinus().mul(cellRnd.z.smoothstep(0.55, 0.65))
        const trace = bus.max(jumper).max(pad).clamp()
        const fineCells = cellNoiseVec3(vec3(tube.x.mul(144).floor(), tube.y.mul(32).floor(), 9.1))
        const fineBus = opticalLine(tube.y.mul(32).fract().sub(0.5), 0.03).mul(intimate)
        const fineJumper = opticalLine(tube.x.mul(144).fract().sub(0.5), 0.03).mul(fineCells.x.smoothstep(0.5, 0.6)).mul(intimate)
        const traces = trace.max(fineBus.mul(0.7)).max(fineJumper.mul(0.7)).clamp()
        const silicon = mx_fractal_noise_float(p.mul(26), 2, 2, 0.5).mul(0.5).add(0.5)
        const rowRnd = cellNoiseVec3(vec3(row, 7.7, 3.1)).x
        const pulse = tube.x.mul(Math.PI * 6).sub(time.mul(rowRnd.mul(3).add(1.5))).add(rowRnd.mul(6.28)).sin().mul(0.5).add(0.5).pow(24)
        this.colorNode = mix(mix(color('#05070a'), color('#10141a'), silicon), color('#c9a24e'), traces)
        this.metalnessNode = traces.mul(0.85).add(0.1)
        this.roughnessNode = float(0.5).add(silicon.mul(0.15)).sub(traces.mul(0.28)).clamp()
        this.anisotropy = 0.6
        this.normalNode = proceduralNormal(traces.mul(0.6), 0.0012)
        this.emissiveNode = color('#7fe9ff').mul(pulse).mul(bus.add(pad)).mul(1.6).mul(near.mul(0.5).add(0.6))
          .add(color('#ffd76a').mul(pad).mul(glints(normalViewGeometry, 80)).mul(0.9))
          .add(color('#7fe9ff').mul(fineBus.add(fineJumper)).mul(intimate).mul(0.5))
          .add(color('#20303f').mul(rim).mul(0.2))
        break
      }
      case 'ferrofluid_crown': {
                // magnetic liquid that senses you: spikes rise toward the camera, ripples chase your steps
        this.envMapIntensity = 1.4
        const {p, view, cameraLocal, rim, intimate} = viewerFrame()
        const dist = cameraLocal.sub(p).length()
        const toward = dist.smoothstep(0.9, 3.2).oneMinus()
        const drift = vec3(time.mul(0.05), time.mul(-0.04), time.mul(0.03))
        const cones = mx_worley_noise_float(p.mul(9).add(drift))
        const spikes = cones.mul(1.7).oneMinus().clamp().pow(2.2)
        const spikeField = spikes.mul(toward.mul(0.9).add(0.25))
        const ripple = dist.mul(26).sub(time.mul(4)).sin().mul(dist.smoothstep(0.6, 2.4).oneMinus().mul(intimate)).mul(0.5)
        const field = spikeField.add(ripple)
        this.colorNode = color('#040406')
        this.metalness = 0.65
        this.roughnessNode = float(0.32).sub(spikeField.mul(0.2)).clamp()
        this.clearcoat = 1
        this.clearcoatRoughnessNode = spikeField.mul(0.25).add(0.04)
        this.iridescence = 0.55
        this.iridescenceIOR = 1.3
        this.iridescenceThicknessNode = spikeField.mul(420).add(view.x.mul(80)).add(120)
        this.normalNode = proceduralNormal(field, 0.016)
        this.emissiveNode = spectralColor(spikeField.mul(2.5).add(view.x.mul(1.5))).mul(spikeField.pow(3)).mul(0.3)
          .add(color('#3a4a8f').mul(rim).mul(0.18))
          .add(color('#8f9fff').mul(glints(normalViewGeometry, 50)).mul(spikeField).mul(0.5))
        break
      }
      case 'harlequin_opal': {
                // precious opal; fire patches glide with parallax and ignite as the viewing angle aligns
        this.envMapIntensity = 0.7
        this.transmission = 0.25
        this.thickness = 0.5
        this.ior = 1.45
        this.attenuationColor.set('#ffe9f5')
        this.attenuationDistance = 0.9
        this.roughness = 0.22
        this.metalness = 0
        this.clearcoat = 1
        this.clearcoatRoughness = 0.04
        this.sheen = 0.5
        this.sheenColor.set('#ffffff')
        this.sheenRoughness = 0.45
        const {p, view, rim, near, intimate} = viewerFrame()
        const cellP = p.sub(view.mul(0.12)).mul(4.2)
        const id = cellNoiseVec3(cellP)
        const id2 = cellNoiseVec3(cellP.add(17.31))
        const centre = id.mul(0.6).add(0.2)
        const d = cellP.fract().sub(centre).length()
        const footprint = cellP.fwidth().length().max(0.001)
        const patch = d.smoothstep(0.08, footprint.mul(1.5).add(0.34)).oneMinus()
        const present = id2.x.smoothstep(0.42, 0.55)
        const ignition = view.x.mul(2.6).add(view.y.mul(1.9)).add(id.z.mul(6.283)).cos().mul(0.5).add(0.5).pow(3)
        const playColor = spectralColor(id.y.mul(6).add(view.x.mul(2)).add(view.y.mul(1.2)))
        const flash = patch.mul(present).mul(ignition)
        const pin = mx_cell_noise_float(p.sub(view.mul(0.06)).mul(70)).smoothstep(0.975, 0.99).mul(intimate)
        this.colorNode = mix(color('#efe9df'), color('#dfd5c6'), mx_noise_float(p.mul(5)).mul(0.5).add(0.5))
        this.normalNode = proceduralNormal(mx_noise_float(p.mul(8)), 0.0006)
        this.emissiveNode = playColor.mul(flash).mul(1.7).mul(near.mul(0.5).add(0.6))
          .add(spectralColor(id.z.mul(9).add(2)).mul(pin).mul(1.6))
          .add(color('#ffd9ec').mul(rim).mul(0.12))
        break
      }
      case 'runic_monolith': {
                // carved dark stone; a teal ignition wave sweeps the glyphs, gold leaf glints inside the grooves
        this.envMapIntensity = 0.6
        const {p, facing, rim, near, intimate} = viewerFrame()
        const tube = uv()
        const gx = tube.x.mul(64)
        const gy = tube.y.mul(4)
        const rnd = cellNoiseVec3(vec3(gx.floor(), gy.floor(), 5.5))
        const rnd2 = cellNoiseVec3(vec3(gx.floor(), gy.floor(), 9.2))
        const local = vec2(gx.fract(), gy.fract())
        const stroke = (r: Node<'vec3'>, offset: number) => opticalLine(local.x.mul(r.x.mul(4).sub(2)).add(local.y.mul(r.y.mul(4).sub(2))).add(r.z.mul(2).sub(1)).add(offset), 0.05)
        const window = local.x.smoothstep(0.1, 0.2).mul(local.x.smoothstep(0.8, 0.9).oneMinus()).mul(local.y.smoothstep(0.15, 0.25)).mul(local.y.smoothstep(0.75, 0.85).oneMinus())
        const glyph = stroke(rnd, 0).max(stroke(rnd2, 0.35)).max(stroke(rnd.mul(rnd2), 0.7)).mul(window)
        const stone = mx_fractal_noise_float(p.mul(9), 4, 2, 0.5).mul(0.5).add(0.5)
        const sweep = tube.x.mul(Math.PI * 4).sub(time.mul(0.9)).sin().mul(0.5).add(0.5).pow(5)
        const faceBoost = facing.pow(3).mul(0.8).add(0.35)
        const veins = filament(mx_fractal_noise_float(p.mul(12), 3, 2, 0.5), 0.02).mul(intimate)
        this.colorNode = mix(mix(color('#14151c'), color('#232733'), stone), color('#7a5c2e'), glyph.mul(0.85))
        this.metalnessNode = glyph.mul(0.9)
        this.roughnessNode = float(0.9).sub(glyph.mul(0.55)).clamp()
        this.clearcoat = 0.1
        this.clearcoatRoughness = 0.6
        this.normalNode = proceduralNormal(glyph.mul(0.9).add(stone.mul(0.2)), 0.0016)
        this.emissiveNode = color('#43ffd0').mul(glyph).mul(sweep.mul(1.2).add(0.25)).mul(faceBoost).mul(near.mul(0.6).add(0.45))
          .add(color('#ffd98a').mul(glyph).mul(glints(normalViewGeometry, 70)).mul(0.6))
          .add(color('#2bffd9').mul(veins).mul(0.5))
          .add(color('#1b8f74').mul(rim).mul(0.25))
        break
      }
    }
  }
}
