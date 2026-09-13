import type {Node, Texture} from 'three/webgpu'

import * as tsl from 'three/tsl'
import {bitangentView,
  cameraPosition,
  color,
  float,
  mix,
  modelWorldMatrixInverse,
  mx_cell_noise_float,
  mx_fractal_noise_float,
  mx_noise_float,
  negateOnBackSide,
  normalLocal,
  normalViewGeometry,
  positionGeometry,
  positionView,
  positionViewDirection,
  positionWorld,
  tangentView,
  time,
  uv,
  vec2,
  vec3,
  vec4} from 'three/tsl'
import {MeshPhysicalNodeMaterial} from 'three/webgpu'

const TAU = Math.PI * 2
const cellNoiseVec3 = (tsl as typeof tsl & {
  mx_cell_noise_vec3: (position: Node<'vec3'>) => Node<'vec3'>
}).mx_cell_noise_vec3
function viewerFrame() {
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
    rim: grazing.pow(2.2),
    distance,
    near: distance.smoothstep(1.25, 5.6).oneMinus(),
    intimate: distance.smoothstep(0.8, 2.7).oneMinus(),
  }
}
function filament(field: Node<'float'>, width: number, softness = 1.3) {
  const footprint = field.fwidth().max(0.0001)
  const core = field.abs()
    .smoothstep(width, footprint.mul(softness).add(width))
    .oneMinus()
  const survival = footprint
    .smoothstep(width * 4, width * 20)
    .oneMinus()
  return core.mul(survival)
}
function pulse01(value: Node<'float'>, centre: number, width: number) {
  const footprint = value.fwidth().max(0.0001)
  return value
    .sub(centre)
    .abs()
    .smoothstep(width, footprint.mul(1.25).add(width))
    .oneMinus()
}
function resolvedCosine(phase: Node<'float'>) {
  const visibility = phase.fwidth().smoothstep(0.65, 2.8).oneMinus()
  return phase.cos().mul(visibility)
}
function proceduralNormal(height: Node<'float'>, strength: number) {
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
function cellGrain(position: Node<'vec3'>,
  scale: number,
  threshold: number) {
  const cell = position.mul(scale)
  const rnd = cellNoiseVec3(cell)
  const centre = rnd.mul(0.5).add(0.25)
  const distance = cell.fract().sub(centre).length()
  const footprint = cell.fwidth().length().max(0.001)
  const radius = footprint.mul(0.9).max(0.045)
  const core = distance
    .smoothstep(radius.mul(0.2), radius)
    .oneMinus()
  const gate = rnd.x.smoothstep(threshold, threshold + 0.012)
  const survival = footprint.smoothstep(0.3, 1.1).oneMinus()
  return {
    mask: core.mul(gate).mul(survival).clamp(),
    rnd,
  }
}
function multiGlint(normal: Node<'vec3'>, sharpness: number) {
  const lamps = [
    vec3(0.41, 0.76, 0.49),
    vec3(-0.68, 0.2, 0.71),
    vec3(0.08, -0.42, 0.9),
  ]
  let sum: Node<'float'> = float(0)
  for (const lamp of lamps) {
    const halfVector = lamp
      .normalize()
      .add(positionViewDirection)
      .normalize()
    sum = sum.add(normal.dot(halfVector).clamp().pow(sharpness))
  }
  return sum
}
function iceFracture(q: Node<'vec3'>,
  seed: number,
  detail: number) {
  const offset = vec3(seed * 7.13, seed * -3.71, seed * 5.47)
  const direction = vec3(0.31 + seed * 0.07, 0.87 - seed * 0.04, -0.36 + seed * 0.03).normalize()
  const guide = mx_noise_float(q.mul(4.1).add(offset))
  const shard = mx_noise_float(q.mul(detail)
    .add(offset.mul(2.7))
    .add(guide.mul(2.1)))
  const fork = mx_noise_float(q.mul(detail * 1.65)
    .sub(offset)
    .add(shard.mul(1.4)))
  const territory = guide
    .abs()
    .smoothstep(0.16, 0.72)
    .oneMinus()
  const trunk = filament(shard.add(guide.mul(0.32)), 0.025)
  const twigs = filament(fork.add(shard.mul(0.2)), 0.018)
  const crystalPlane = filament(q.dot(direction)
    .mul(detail * 0.78)
    .add(guide.mul(2.4))
    .sin(), 0.035)
  return trunk
    .mul(territory.mul(0.45).add(0.75))
    .add(twigs.mul(territory).mul(0.7))
    .add(crystalPlane.mul(territory).mul(0.22))
    .clamp()
}
function hyphae(q: Node<'vec3'>,
  seed: number) {
  const offset = vec3(seed * 4.7, seed * -7.1, seed * 2.9)
  const guide = mx_noise_float(q.mul(3.2).add(offset))
  const trunkField = mx_noise_float(q.mul(10.5)
    .add(offset.mul(1.7))
    .add(guide.mul(2.25)))
  const hairField = mx_noise_float(q.mul(24)
    .sub(offset)
    .add(trunkField.mul(1.7)))
  const territory = guide
    .abs()
    .smoothstep(0.12, 0.68)
    .oneMinus()
  const trunks = filament(trunkField.add(guide.mul(0.28)), 0.029)
  const hairs = filament(hairField.add(trunkField.mul(0.24)), 0.018)
  return trunks
    .mul(territory.mul(0.4).add(0.7))
    .add(hairs.mul(territory).mul(0.65))
    .clamp()
}
function stormBolt(q: Node<'vec3'>,
  seed: number) {
  const family = Math.abs(Math.floor(seed * 3)) % 3
  const axis = [
    vec3(0.27, 0.93, 0.24).normalize(),
    vec3(-0.67, 0.46, 0.58).normalize(),
    vec3(0.72, 0.2, -0.66).normalize(),
  ][family]
  const sideSeed = [
    vec3(0.91, -0.31, 0.16),
    vec3(0.3, 0.87, -0.39),
    vec3(0.15, 0.93, 0.34),
  ][family]
  const side = sideSeed
    .sub(axis.mul(sideSeed.dot(axis)))
    .normalize()
  const across = axis.cross(side).normalize()
  const along = q.dot(axis)
  const epoch = time.mul(0.78).floor()
  const jitter = mx_noise_float(vec3(along.mul(3.2), epoch.mul(0.13), seed + 2.1))
  const laneX = q
    .dot(side)
    .mul(2.7)
    .add(along
      .mul(8 + seed * 0.17)
      .sin()
      .mul(0.16))
    .add(jitter.mul(0.34))
    .add(seed * 0.271)
  const laneY = q
    .dot(across)
    .mul(2.7)
    .add(along
      .mul(6.3 + seed * 0.11)
      .cos()
      .mul(0.14))
    .sub(jitter.mul(0.26))
    .add(seed * 0.419)
  const cellX = laneX.add(0.5).fract().sub(0.5)
  const cellY = laneY.add(0.5).fract().sub(0.5)
  const distance = vec2(cellX, cellY).length()
  const footprint = distance.fwidth().max(0.001)
  const core = distance
    .smoothstep(0.018, footprint.mul(1.25).add(0.03))
    .oneMinus()
  const topology = mx_noise_float(q.mul(4.6)
    .add(vec3(seed * 2.7, seed * -4.1, seed * 5.3))
    .add(epoch.mul(0.071)))
  const gate = topology.smoothstep(-0.18, 0.24)
  const flash = time
    .mul(4.7 + seed * 0.11)
    .add(topology.mul(17))
    .sin()
    .mul(0.5)
    .add(0.5)
    .pow(9)
    .mul(0.85)
    .add(0.15)
  const forkField = cellX
    .add(cellY.mul(0.62))
    .add(along
      .mul(13 + seed)
      .sin()
      .mul(0.07))
  const fork = filament(forkField, 0.018)
  const reach = distance.smoothstep(0.09, 0.34).oneMinus()
  const survival = footprint.smoothstep(0.08, 0.3).oneMinus()
  return core
    .mul(gate)
    .mul(flash)
    .add(fork
      .mul(reach)
      .mul(gate)
      .mul(flash)
      .mul(0.35))
    .mul(survival)
    .clamp()
}

export const knotPremiumFinishes = [
  {
    id: 'glacial_cipher',
    title: 'Glacial Cipher',
    accent: '#a4efff',
  },
  {
    id: 'magnetite_field',
    title: 'Magnetite Field',
    accent: '#9dbbc2',
  },
  {
    id: 'mycelial_lantern',
    title: 'Mycelial Lantern',
    accent: '#c4ff68',
  },
  {
    id: 'chromatophore_skin',
    title: 'Chromatophore Skin',
    accent: '#28dfc1',
  },
  {
    id: 'pentimento_fresco',
    title: 'Pentimento Fresco',
    accent: '#5077e8',
  },
  {
    id: 'velvet_chiaroscuro',
    title: 'Velvet Chiaroscuro',
    accent: '#9c66ff',
  },
  {
    id: 'captured_tempest',
    title: 'Captured Tempest',
    accent: '#c8dcff',
  },
  {
    id: 'weeping_basalt',
    title: 'Weeping Basalt',
    accent: '#86cbd8',
  },
] as const

export type KnotPremiumFinish
  = typeof knotPremiumFinishes[number]['id']

export class KnotMaterialPremium extends MeshPhysicalNodeMaterial {
  constructor(finish: KnotPremiumFinish,
    environment: Texture) {
    super({
      envMap: environment,
      envMapIntensity: 0.9,
    })
    this.name = finish
    switch (finish) {
      case 'glacial_cipher': {
        this.envMapIntensity = 1.1
        const {p,
          view,
          facing,
          grazing,
          rim,
          near,
          intimate} = viewerFrame()
        const shallow = iceFracture(p.sub(view.mul(0.035)), 1.1, 17)
        const middle = iceFracture(p.sub(view.mul(0.11)), 2.3, 21)
        const deep = iceFracture(p.sub(view.mul(0.21)), 3.7, 27)
        const fractures = shallow
          .mul(0.65)
          .add(middle.mul(0.8))
          .add(deep.mul(grazing.mul(0.55).add(0.55)))
          .clamp()
        const surface = mx_fractal_noise_float(p.mul(10.5), 3, 2, 0.5)
          .mul(0.5)
          .add(0.5)
        const frost = surface
          .smoothstep(0.64, 0.86)
          .mul(grazing.mul(0.8).add(0.12))
        const bubbles = cellGrain(p.sub(view.mul(0.14)), 58, 0.976)
        const angleTint = view
          .dot(vec3(0.53, -0.21, 0.82).normalize())
          .mul(0.5)
          .add(0.5)
        const paleFactor = facing
          .pow(0.65)
          .mul(0.62)
          .add(angleTint.mul(0.18))
          .clamp()
        const ice = mix(color('#5f9eac'), color('#e8fbff'), paleFactor)
        this.colorNode = mix(ice, color('#f7ffff'), frost.mul(0.7)).mul(fractures.mul(0.08).add(0.82))
        this.transmission = 1
        this.transmissionNode = float(0.94)
          .sub(fractures.mul(0.5))
          .sub(frost.mul(0.42))
          .clamp(0.18, 0.95)
        this.thickness = 0.72
        this.ior = 1.31
        this.dispersion = 0.08
        this.attenuationColor.set('#5ca7b8')
        this.attenuationDistance = 0.65
        this.roughnessNode = float(0.035)
          .add(frost.mul(0.48))
          .add(shallow.mul(0.1))
          .clamp(0.025, 0.58)
        const iceNormal = proceduralNormal(surface
          .mul(0.22)
          .add(shallow.mul(0.55))
          .add(frost.mul(0.2)), 0.0014)
        this.normalNode = iceNormal
        this.clearcoat = 1
        this.clearcoatNormalNode = iceNormal
        this.clearcoatRoughnessNode = float(0.025)
          .add(frost.mul(0.3))
        const fractureTint = mix(color('#63d8ff'), color('#ffffff'), angleTint)
        this.emissiveNode = fractureTint
          .mul(fractures)
          .mul(near.mul(0.75).add(0.18))
          .add(color('#efffff')
            .mul(bubbles.mask)
            .mul(intimate)
            .mul(0.85))
          .add(color('#4e9eb1')
            .mul(rim)
            .mul(0.035))
        break
      }
      case 'magnetite_field': {
        this.envMapIntensity = 1.35
        const p = positionGeometry
        const tube = uv()
        const cameraLocal = modelWorldMatrixInverse
          .mul(vec4(cameraPosition, 1))
          .xyz
        const observerDirection = cameraLocal
          .sub(p)
          .normalize()
        const proximity = cameraLocal
          .sub(p)
          .length()
          .smoothstep(1.1, 5)
          .oneMinus()
        const observer = observerDirection.dot(vec3(0.58, 0.39, -0.71).normalize())
        const phaseA = tube.x
          .mul(TAU * 36)
          .add(tube.y
            .mul(TAU * 7)
            .sin()
            .mul(1.25))
          .add(observer
            .mul(proximity)
            .mul(0.65))
          .add(time.mul(0.09))
        const phaseB = tube.y
          .mul(TAU * 12)
          .sub(tube.x
            .mul(TAU * 5)
            .sin()
            .mul(0.8))
          .sub(time.mul(0.065))
        const phaseC = tube.x
          .mul(TAU * 23)
          .sub(tube.y.mul(TAU * 19))
          .add(observer.mul(0.4))
          .add(time.mul(0.045))
        const combA = phaseA
          .sin()
          .abs()
          .pow(12)
          .mul(phaseB
            .cos()
            .abs()
            .pow(8))
        const combB = phaseC
          .sin()
          .abs()
          .pow(10)
          .mul(phaseA
            .mul(0.63)
            .cos()
            .abs()
            .pow(7))
        const domain = mx_noise_float(p.mul(7).add(vec3(time.mul(0.018), time.mul(-0.011), time.mul(0.009))))
        const needles = combA
          .mul(domain.mul(0.35).add(0.82))
          .add(combB.mul(0.58))
          .clamp()
        const height = needles
          .pow(0.72)
          .mul(proximity.mul(0.5).add(0.55))
          .mul(0.041)
          .add(domain.mul(0.0025))
        this.positionNode = p.add(normalLocal.mul(height))
        const {facing,
          grazing,
          near,
          intimate} = viewerFrame()
        const domainWall = filament(domain, 0.032)
        const oxideRaw = mx_fractal_noise_float(p.mul(9), 3, 2, 0.5)
          .mul(0.5)
          .add(0.5)
        const oxide = oxideRaw
          .smoothstep(0.7, 0.9)
          .mul(domainWall.oneMinus())
        const needleLight = facing
          .mul(0.16)
          .add(needles.mul(0.58))
          .clamp()
        const iron = mix(color('#020405'), color('#718087'), needleLight)
        const temper = mix(color('#352219'), color('#17383e'), observer.mul(0.5).add(0.5))
        this.colorNode = mix(iron, temper, domainWall
          .mul(0.17)
          .add(oxide.mul(0.28))
          .clamp())
        this.metalness = 0.98
        this.roughnessNode = float(0.23)
          .sub(needles.mul(0.13))
          .add(oxide.mul(0.16))
          .add(grazing.mul(0.025))
          .clamp(0.055, 0.42)
        this.clearcoat = 0.22
        this.clearcoatRoughness = 0.16
        this.anisotropy = 0.88
        this.anisotropyRotation = Math.PI * 0.5
        const magneticNormal = proceduralNormal(height, 0.9)
        this.normalNode = magneticNormal
        const glint = multiGlint(magneticNormal, 120)
        const barkhausen = time
          .mul(3.4)
          .add(domain.mul(19))
          .add(tube.x.mul(TAU * 11))
          .sin()
          .mul(0.5)
          .add(0.5)
          .pow(24)
        this.emissiveNode = color('#8ee7ff')
          .mul(domainWall)
          .mul(barkhausen)
          .mul(intimate)
          .mul(0.75)
          .add(color('#e9ffff')
            .mul(glint)
            .mul(needles)
            .mul(near.mul(0.16).add(0.035)))
        break
      }
      case 'mycelial_lantern': {
        this.envMapIntensity = 0.55
        const {p,
          view,
          facing,
          grazing,
          rim,
          near,
          intimate} = viewerFrame()
        const shallow = hyphae(p.sub(view.mul(0.025)), 1.2)
        const middle = hyphae(p.sub(view.mul(0.085)), 3.1)
        const deep = hyphae(p.sub(view.mul(0.15)), 5.4)
        const network = shallow
          .mul(0.75)
          .add(middle.mul(0.72))
          .add(deep.mul(grazing.mul(0.45).add(0.38)))
          .clamp()
        const inner = p.sub(view.mul(0.09))
        const pulsePhase = inner
          .dot(vec3(5.4, 12.5, -4.1))
          .sub(time.mul(0.72))
          .add(mx_noise_float(inner.mul(3.3)).mul(4))
        const pulse = pulsePhase
          .sin()
          .mul(0.5)
          .add(0.5)
          .pow(8)
        const skinNoise = mx_fractal_noise_float(p.mul(12), 3, 2, 0.5)
          .mul(0.5)
          .add(0.5)
        const age = skinNoise.smoothstep(0.58, 0.86)
        const body = mix(color('#bdb295'), color('#252319'), age)
        this.colorNode = mix(body, color('#46542a'), network.mul(0.2))
        this.transmission = 0.35
        this.transmissionNode = facing
          .mul(0.16)
          .add(network.mul(0.09))
          .add(0.09)
          .clamp(0.08, 0.36)
        this.thickness = 0.42
        this.ior = 1.39
        this.attenuationColor.set('#758c36')
        this.attenuationDistance = 0.58
        this.roughnessNode = float(0.46)
          .add(age.mul(0.22))
          .sub(network.mul(0.08))
          .clamp(0.3, 0.72)
        this.clearcoat = 0.08
        this.clearcoatRoughness = 0.4
        this.sheen = 0.18
        this.sheenColor.set('#ddd3ac')
        this.sheenRoughness = 0.72
        this.normalNode = proceduralNormal(skinNoise
          .mul(0.16)
          .add(shallow.mul(0.28)), 0.0018)
        const spores = cellGrain(p.sub(view.mul(0.11)), 72, 0.988)
        const primaryTint = mix(color('#8dff36'), color('#fff1a0'), pulse)
        const sporeTint = mix(color('#b1ff67'), color('#fff7c8'), spores.rnd.z)
        this.emissiveNode = primaryTint
          .mul(network)
          .mul(pulse.mul(0.8).add(0.28))
          .mul(near.mul(0.72).add(0.22))
          .add(sporeTint
            .mul(spores.mask)
            .mul(intimate)
            .mul(1.15))
          .add(color('#6e9d38')
            .mul(rim)
            .mul(0.055))
        break
      }
      case 'chromatophore_skin': {
        this.envMapIntensity = 0.85
        const p = positionGeometry
        const cameraLocal = modelWorldMatrixInverse
          .mul(vec4(cameraPosition, 1))
          .xyz
        const proximity = cameraLocal
          .sub(p)
          .length()
          .smoothstep(1, 4.8)
          .oneMinus()
        const q = p.mul(17)
        const rnd = cellNoiseVec3(q)
        const centre = rnd.mul(0.52).add(0.24)
        const cellDistance = q.fract().sub(centre).length()
        const wavePhase = p
          .dot(vec3(0.64, 0.71, -0.29))
          .mul(13)
          .sub(time.mul(0.85))
          .add(rnd.z.mul(TAU))
        const wave = wavePhase
          .sin()
          .mul(0.5)
          .add(0.5)
        const activation = wave
          .pow(3)
          .mul(proximity.mul(0.75).add(0.25))
        const radius = activation
          .mul(0.11)
          .add(0.085)
        const discRaw = cellDistance
          .smoothstep(radius, radius.add(0.035))
          .oneMinus()
        const q2 = p.mul(39).add(13.7)
        const rnd2 = cellNoiseVec3(q2)
        const centre2 = rnd2.mul(0.5).add(0.25)
        const fineDistance = q2
          .fract()
          .sub(centre2)
          .length()
        const finePhase = p
          .dot(vec3(-0.46, 0.28, 0.84))
          .mul(21)
          .add(time.mul(0.33))
          .add(rnd2.y.mul(TAU))
        const fineSignal = finePhase
          .sin()
          .mul(0.5)
          .add(0.5)
        const fineRadius = fineSignal
          .mul(0.025)
          .add(proximity.mul(0.025))
          .add(0.055)
        const fineRaw = fineDistance
          .smoothstep(fineRadius, fineRadius.add(0.025))
          .oneMinus()
        const papillaHeight = discRaw
          .mul(activation)
          .mul(0.012)
          .add(fineRaw
            .mul(proximity)
            .mul(0.002))
        this.positionNode = p.add(normalLocal.mul(papillaHeight))
        const {view,
          facing,
          grazing,
          near,
          intimate} = viewerFrame()
        const cellAA = cellDistance.fwidth().max(0.001)
        const disc = cellDistance
          .smoothstep(radius, radius
            .add(cellAA.mul(1.35))
            .add(0.004))
          .oneMinus()
          .mul(cellAA
            .smoothstep(0.1, 0.36)
            .oneMinus())
        const fineAA = fineDistance.fwidth().max(0.001)
        const fineDisc = fineDistance
          .smoothstep(fineRadius, fineRadius
            .add(fineAA.mul(1.3))
            .add(0.003))
          .oneMinus()
          .mul(fineAA
            .smoothstep(0.16, 0.55)
            .oneMinus())
          .mul(intimate)
        const structuralNoise = mx_noise_float(p.mul(24).add(rnd.y.mul(3)))
          .mul(0.5)
          .add(0.5)
        const structural = grazing
          .pow(1.35)
          .mul(structuralNoise
            .mul(0.5)
            .add(0.25))
          .clamp()
        const baseSkin = mix(color('#17150f'), color('#91866b'), facing.mul(0.35)
          .add(structuralNoise.mul(0.18))
          .clamp())
        const warmCell = mix(color('#df8a17'), color('#6b2419'), rnd.x)
        const cellColor = mix(warmCell, color('#101519'), rnd.y.pow(1.7).mul(0.38))
        const body = mix(baseSkin, cellColor, disc)
        const detailedBody = mix(body, mix(color('#e7d9b1'), color('#324945'), rnd2.z), fineDisc.mul(0.62))
        const angleColor = view
          .dot(vec3(0.72, -0.16, 0.67).normalize())
          .mul(0.5)
          .add(0.5)
        const shimmerTint = mix(color('#16a997'), color('#5965d4'), angleColor)
        this.colorNode = mix(detailedBody, shimmerTint, structural.mul(0.58))
        this.metalness = 0
        this.roughnessNode = float(0.42)
          .sub(disc.mul(0.16))
          .add(fineDisc.mul(0.08))
          .sub(structural.mul(0.08))
          .clamp(0.16, 0.55)
        this.clearcoat = 0.75
        this.clearcoatRoughness = 0.11
        this.sheen = 0.2
        this.sheenColor.set('#d6c49e')
        this.sheenRoughness = 0.5
        this.iridescence = 1
        this.iridescenceNode = structural
          .mul(0.9)
          .add(fineDisc.mul(0.12))
          .clamp()
        this.iridescenceIOR = 1.31
        this.iridescenceThicknessNode = rnd.z
          .mul(260)
          .add(110)
        const skinNormal = proceduralNormal(papillaHeight
          .add(fineRaw.mul(0.0015))
          .add(structuralNoise.mul(0.0008)), 0.9)
        this.normalNode = skinNormal
        this.clearcoatNormalNode = skinNormal
        const waveFront = filament(wavePhase.sin(), 0.045)
        this.emissiveNode = color('#3affcf')
          .mul(waveFront)
          .mul(disc)
          .mul(near)
          .mul(0.5)
          .add(color('#ffb341')
            .mul(disc)
            .mul(activation)
            .mul(intimate)
            .mul(0.09))
        break
      }
      case 'pentimento_fresco': {
        this.envMapIntensity = 0.62
        const {p,
          view,
          grazing,
          near,
          intimate} = viewerFrame()
        const topGesture = mx_fractal_noise_float(p.mul(3.1), 3, 2, 0.5)
          .mul(0.5)
          .add(0.5)
        const topVein = mx_noise_float(p.mul(8.5).add(topGesture.mul(1.7)))
          .mul(0.5)
          .add(0.5)
        const ochreLayer = mix(color('#92714d'), color('#c2a26d'), topGesture)
        const upperFresco = mix(ochreLayer, color('#63756e'), topVein
          .smoothstep(0.57, 0.82)
          .mul(0.48))
        const parallaxDepth = grazing
          .mul(0.052)
          .add(intimate.mul(0.016))
          .add(0.012)
        const inner = p.sub(view.mul(parallaxDepth))
        const underNoise = mx_noise_float(inner.mul(4.2))
        const gesturePhase = inner
          .dot(vec3(0.35, 0.88, -0.31))
          .mul(10.5)
          .add(underNoise.mul(3.1))
        const counterPhase = inner
          .dot(vec3(-0.79, 0.22, 0.57))
          .mul(8.3)
          .sub(underNoise.mul(2.4))
        const gesture = gesturePhase
          .sin()
          .mul(0.5)
          .add(0.5)
        const counter = counterPhase
          .cos()
          .mul(0.5)
          .add(0.5)
        const underBase = mix(color('#163b8c'), color('#287367'), counter.pow(1.35))
        const underPigment = mix(underBase, color('#a64e32'), gesture.pow(2).mul(0.68))
        const drawing = filament(gesturePhase.sin(), 0.055).max(filament(counterPhase.cos(), 0.05))
        const illuminatedUnderpainting = mix(underPigment, color('#d7bd74'), drawing.mul(0.55))
        const crackGuide = mx_noise_float(p.mul(4.5).add(7.4))
        const crackField = mx_noise_float(p.mul(27)
          .add(crackGuide.mul(2.1))
          .add(vec3(3.1, -6.4, 9.2)))
        const cracks = filament(crackField.add(crackGuide.mul(0.18)), 0.022)
        const erosion = mx_fractal_noise_float(p.mul(6.5).add(4.8), 4, 2, 0.5)
          .mul(0.5)
          .add(0.5)
        const viewKey = view
          .dot(vec3(0.62, -0.29, 0.73).normalize())
          .mul(0.5)
          .add(0.5)
        const erosionEdge = float(0.7)
          .sub(grazing.mul(0.2))
          .sub(intimate.mul(0.09))
          .add(viewKey.mul(0.05))
        const reveal = erosion
          .smoothstep(erosionEdge, erosionEdge.add(0.13))
          .mul(0.84)
          .add(cracks.mul(0.35))
          .clamp()
        const plaster = mix(color('#b7aa8e'), color('#e0d5b8'), topVein)
        const chalk = erosion
          .smoothstep(0.9, 0.98)
          .mul(near.mul(0.4).add(0.25))
        const layered = mix(upperFresco, illuminatedUnderpainting, reveal)
        const withPlaster = mix(layered, plaster, chalk.mul(0.42))
        this.colorNode = mix(withPlaster, color('#30271f'), cracks.mul(0.7))
        this.metalness = 0
        this.roughnessNode = float(0.76)
          .sub(reveal.mul(0.08))
          .add(chalk.mul(0.12))
          .sub(cracks.mul(0.05))
          .clamp(0.58, 0.9)
        this.clearcoat = 0.035
        this.clearcoatRoughness = 0.8
        const frescoNormal = proceduralNormal(erosion
          .mul(0.18)
          .add(cracks.mul(0.42))
          .add(topVein.mul(0.08)), 0.0016)
        this.normalNode = frescoNormal
        const mica = cellGrain(inner, 105, 0.993)
        const micaGlint = multiGlint(frescoNormal, 105)
        this.specularIntensityNode = float(0.28)
          .add(mica.mask.mul(0.7))
        this.emissiveNode = color('#668aff')
          .mul(mica.mask)
          .mul(micaGlint)
          .mul(intimate)
          .mul(1.15)
          .add(illuminatedUnderpainting
            .mul(drawing)
            .mul(reveal)
            .mul(intimate)
            .mul(0.04))
        break
      }
      case 'velvet_chiaroscuro': {
        this.envMapIntensity = 0.72
        const {p,
          view,
          grazing,
          near,
          intimate} = viewerFrame()
        const tube = uv()
        const orientation = mx_noise_float(p.mul(3.1))
          .mul(2.4)
          .add(tube.x.mul(TAU * 3))
          .add(tube.y.mul(TAU * 2))
        const bitangent = vec3(bitangentView as unknown as Node<'vec3'>).normalize()
        const fibre = tangentView
          .mul(orientation.cos())
          .add(bitangent.mul(orientation.sin()))
          .normalize()
        const alignment = fibre
          .dot(positionViewDirection)
          .abs()
        const flash = alignment
          .sub(0.34)
          .abs()
          .smoothstep(0.035, 0.25)
          .oneMinus()
        const brushPhase = tube.x
          .mul(TAU * 9)
          .add(tube.y
            .mul(TAU * 5)
            .sin()
            .mul(0.7))
          .add(mx_noise_float(p.mul(4.2)).mul(1.8))
        const brushed = brushPhase
          .cos()
          .mul(0.5)
          .add(0.5)
        const warpPhase = tube.x.mul(TAU * 240)
        const weftPhase = tube.y
          .mul(TAU * 52)
          .add(tube.x
            .mul(TAU * 7)
            .sin()
            .mul(0.35))
        const weaveSignal = resolvedCosine(warpPhase).mul(resolvedCosine(weftPhase))
        const weaveLight = weaveSignal
          .mul(0.5)
          .add(0.5)
        const base = mix(color('#040205'), color('#220a2e'), brushed
          .mul(0.45)
          .add(grazing.mul(0.15))
          .clamp())
        const angleKey = view
          .dot(vec3(0.7, 0.19, -0.69).normalize())
          .mul(0.5)
          .add(0.5)
        const pileTint = mix(color('#6635c7'), color('#c56c43'), angleKey)
        this.colorNode = mix(base, pileTint, flash
          .mul(0.24)
          .add(weaveLight
            .mul(intimate)
            .mul(0.06))
          .clamp())
        this.metalness = 0
        this.roughnessNode = float(0.74)
          .sub(flash.mul(0.16))
          .sub(intimate.mul(0.06))
          .clamp(0.48, 0.78)
        this.anisotropy = 0.72
        this.anisotropyRotation = Math.PI * 0.5
        this.specularIntensity = 0.38
        this.sheen = 1
        this.sheenNode = pileTint.mul(flash
          .mul(0.85)
          .add(grazing.mul(0.28))
          .add(0.08))
        this.sheenRoughnessNode = float(0.29)
          .sub(flash.mul(0.11))
          .add(brushed.mul(0.05))
          .clamp(0.16, 0.36)
        this.retroreflectivityNode = flash
          .mul(0.62)
          .add(grazing.mul(0.08))
          .clamp()
        const weaveHeight = warpPhase
          .sin()
          .mul(0.000_16)
          .add(weftPhase
            .sin()
            .mul(0.000_13))
          .mul(intimate)
          .add(brushed.mul(0.0007))
        const velvetNormal = proceduralNormal(weaveHeight, 1)
        this.normalNode = velvetNormal
        const lint = cellGrain(p, 145, 0.995)
        const lintGlint = multiGlint(velvetNormal, 115)
        this.emissiveNode = mix(color('#d7c9ff'), color('#ffd5ae'), angleKey)
          .mul(lint.mask)
          .mul(lintGlint)
          .mul(intimate)
          .mul(0.75)
          .add(pileTint
            .mul(flash)
            .mul(near)
            .mul(0.018))
        break
      }
      case 'captured_tempest': {
        this.envMapIntensity = 0.42
        const {p,
          view,
          facing,
          rim,
          near,
          intimate} = viewerFrame()
        const chord = facing
          .mul(0.3)
          .add(0.06)
        const drift = vec3(time.mul(0.025), time.mul(-0.06), time.mul(0.018))
        const steps = 6
        let stormGlow: Node<'vec3'> = vec3(0)
        let cloudSum: Node<'float'> = float(0)
        let veil: Node<'float'> = float(1)
        for (let i = 0; i < steps; i++) {
          const t = (i + 0.5) / steps
          const q = p.sub(view.mul(chord.mul(t)))
          const cloud = mx_noise_float(q.mul(4.2)
            .add(drift)
            .add(i * 2.73))
            .mul(0.5)
            .add(0.5)
            .smoothstep(0.5, 0.84)
          const mainBolt = stormBolt(q, i * 0.73 + 1.2)
          const fineBolt
            = i % 2 === 0 ? stormBolt(q.mul(1.72).add(4.7), i + 11.4)
              .mul(intimate)
              .mul(0.48) : float(0)
          const bolt = mainBolt
            .add(fineBolt)
            .clamp()
          const tint = mix(color('#759dff'), color('#fff8dc'), cloud
            .mul(0.35)
            .add(t * 0.65)
            .clamp())
          const depthWeight
            = 1 - Math.abs(t - 0.45) * 0.7
          stormGlow = stormGlow.add(tint
            .mul(bolt)
            .mul(veil)
            .mul(depthWeight))
          cloudSum = cloudSum.add(cloud)
          veil = veil.mul(float(1)
            .sub(cloud.mul(0.12))
            .clamp(0.78, 1))
        }
        const clouds = cloudSum.div(steps)
        this.colorNode = mix(color('#02050a'), color('#25384d'), clouds
          .mul(0.52)
          .add(rim.mul(0.16))
          .clamp())
        this.transmission = 1
        this.transmissionNode = float(0.82)
          .sub(clouds.mul(0.38))
          .clamp(0.3, 0.84)
        this.thickness = 0.76
        this.ior = 1.46
        this.dispersion = 0.1
        this.attenuationColor.set('#1b3151')
        this.attenuationDistance = 0.72
        this.roughnessNode = clouds
          .mul(0.18)
          .add(0.035)
          .clamp(0.03, 0.24)
        this.clearcoat = 1
        this.clearcoatRoughnessNode = clouds
          .mul(0.1)
          .add(0.018)
        const surfaceNoise = mx_noise_float(p.mul(18).add(drift.mul(0.2)))
        this.normalNode = proceduralNormal(surfaceNoise, 0.0008)
        const charge = near
          .mul(0.9)
          .add(0.25)
        this.emissiveNode = stormGlow
          .div(steps)
          .mul(8.5)
          .mul(charge)
          .add(color('#46388e')
            .mul(rim)
            .mul(0.09))
        break
      }
      case 'weeping_basalt': {
        this.envMapIntensity = 1.2
        const {p,
          grazing,
          near,
          intimate} = viewerFrame()
        const world = positionWorld
        const verticalWarp = mx_noise_float(vec3(world.x.mul(2.3), world.z.mul(2.3), world.y.mul(0.65)))
        const streamPhase = world.x
          .mul(18)
          .add(world.z.mul(13))
          .add(verticalWarp.mul(3.1))
          .add(world.y
            .mul(2.5)
            .sin()
            .mul(0.35))
        const tributaryPhase = world.x
          .mul(-11)
          .add(world.z.mul(21))
          .add(verticalWarp.mul(2.2))
          .sub(world.y
            .mul(1.8)
            .sin()
            .mul(0.28))
        const stream = filament(streamPhase.sin(), 0.055)
        const tributary = filament(tributaryPhase.sin(), 0.045)
        const rivulet = stream.max(tributary.mul(0.65))
        const laneRandom = mx_cell_noise_float(vec3(streamPhase
          .mul(0.16)
          .floor(), 7.3, 2.1))
        const dropPhase = world.y
          .mul(6.5)
          .add(time.mul(0.8))
          .add(laneRandom.mul(5))
          .add(near.mul(1.2))
          .fract()
        const bead = pulse01(dropPhase, 0.48, 0.1)
        const filmNoise = mx_fractal_noise_float(p.mul(3.2).add(8.4), 3, 2, 0.5)
          .mul(0.5)
          .add(0.5)
        const filmEdge = float(0.74)
          .sub(near.mul(0.17))
        const film = filmNoise.smoothstep(filmEdge, filmEdge.add(0.13))
        const droplets = cellGrain(vec3(world.x, world.y.add(time.mul(0.045)), world.z), 54, 0.985)
        const wet = film
          .mul(0.5)
          .add(rivulet.mul(bead.mul(0.75).add(0.35)))
          .add(droplets.mask
            .mul(near)
            .mul(0.85))
          .clamp()
        const pores = cellGrain(p, 34, 0.935)
        const stoneNoise = mx_fractal_noise_float(p.mul(14), 4, 2, 0.5)
          .mul(0.5)
          .add(0.5)
        const mineral = mx_noise_float(p.mul(4.1).add(vec3(3.7, -8.1, 5.4)))
          .abs()
          .smoothstep(0.45, 0.8)
        const dryStone = mix(color('#07090a'), color('#333638'), stoneNoise)
        const mineralStone = mix(dryStone, color('#625846'), mineral.mul(0.2))
        const wetTint = mix(color('#05080a'), color('#18333b'), grazing.mul(0.62))
        const wetStone = mix(mineralStone, wetTint, wet.mul(0.76))
        this.colorNode = mix(wetStone, color('#010202'), pores.mask.mul(0.82))
        this.metalness = 0.06
        this.roughnessNode = float(0.78)
          .mix(0.06, wet)
          .add(pores.mask.mul(0.08))
          .clamp(0.045, 0.88)
        const streamProfile = streamPhase
          .sin()
          .abs()
          .smoothstep(0, 0.22)
          .oneMinus()
        const tributaryProfile = tributaryPhase
          .sin()
          .abs()
          .smoothstep(0, 0.2)
          .oneMinus()
        const beadProfile = dropPhase
          .sub(0.48)
          .abs()
          .smoothstep(0.09, 0.18)
          .oneMinus()
        const basaltHeight = stoneNoise
          .mul(0.003)
          .add(streamProfile.mul(0.0015))
          .add(tributaryProfile.mul(0.001))
          .add(beadProfile
            .mul(streamProfile)
            .mul(0.003))
        const basaltNormal = proceduralNormal(basaltHeight, 0.9)
        this.normalNode = basaltNormal
        this.clearcoat = 1
        this.clearcoatNode = wet
        this.clearcoatNormalNode = basaltNormal
        this.clearcoatRoughnessNode = film
          .mul(0.07)
          .add(0.022)
        this.specularIntensityNode = wet
          .mul(0.5)
          .add(0.45)
        const mica = cellGrain(p, 95, 0.991)
        const rainGlint = multiGlint(basaltNormal, 48)
        const micaGlint = multiGlint(basaltNormal, 110)
        this.emissiveNode = color('#b6eaff')
          .mul(rainGlint)
          .mul(wet)
          .mul(near.mul(0.14).add(0.025))
          .add(color('#ffd7a0')
            .mul(mica.mask)
            .mul(micaGlint)
            .mul(intimate)
            .mul(0.9))
        break
      }
    }
  }
}
