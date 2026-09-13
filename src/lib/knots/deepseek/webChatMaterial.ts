import type {Node, Texture} from 'three/webgpu'

import * as tsl from 'three/tsl'
import {cameraPosition, color, float, mix, modelWorldMatrixInverse, mx_cell_noise_float,
  mx_fractal_noise_float, mx_noise_float,
  mx_noise_vec3,
  mx_worley_noise_float, negateOnBackSide, normalViewGeometry, positionGeometry,
  positionView, positionViewDirection, time, uv, vec3, vec4} from 'three/tsl'
import {MeshPhysicalNodeMaterial} from 'three/webgpu'

import {cellularPoints} from '../cellularField.ts'

// KnotMaterialPremium.ts

/* ------------------------------------------------------------------ */
/*  Shared helper nodes (mirrors of the originals for file autonomy)  */
/* ------------------------------------------------------------------ */

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
  const gradient = rx.mul(height.dFdx()).add(ry.mul(height.dFdy()))
    .mul(determinant.sign()).div(determinant.abs().max(1e-12))
  return negateOnBackSide(normal.sub(gradient.mul(strength)).normalize())
}

export function opticalLine(field: Node<'float'>, width: number) {
  const footprint = field.fwidth().max(0.0001)
  return field.abs().smoothstep(width, footprint.mul(1.25).add(width)).oneMinus()
    .mul(footprint.smoothstep(width * 3, width * 12).oneMinus())
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
export function cosinePalette(t: Node<'float'>,
  bias: Triple, amplitude: Triple, frequency: Triple, phase: Triple) {
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

/* ------------------------------------------------------------------ */
/*  New finishes                                                      */
/* ------------------------------------------------------------------ */

export const knotFinishes = [
  {
    id: 'abyssal_cathedral',
    title: 'Abyssal Cathedral',
    accent: '#3ac6d6',
  },
  {
    id: 'iridescent_scarab',
    title: 'Iridescent Scarab',
    accent: '#c9a227',
  },
  {
    id: 'solar_prominence',
    title: 'Solar Prominence',
    accent: '#ff7a1a',
  },
  {
    id: 'bismuth_hopper',
    title: 'Bismuth Hopper',
    accent: '#a0c8ff',
  },
  {
    id: 'aurora_cage',
    title: 'Aurora Cage',
    accent: '#00ff88',
  },
  {
    id: 'clockwork_oracle',
    title: 'Clockwork Oracle',
    accent: '#ffcc44',
  },
  {
    id: 'mycelium_bloom',
    title: 'Mycelium Bloom',
    accent: '#44ffdd',
  },
  {
    id: 'prismatic_haunt',
    title: 'Prismatic Haunt',
    accent: '#c8e8ff',
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
            // ============================================================
            //  1.  ABYSSAL CATHEDRAL
            //      A sunken stone nave, drowned for centuries. Caustic
            //      light from far above, god-rays threading through cold
            //      water, encrusted barnacles and drifting bioluminescent
            //      motes that bloom as the viewer swims closer.
            // ============================================================
      case 'abyssal_cathedral': {
        const {p, facing, grazing, rim, intimate} = viewerFrame()
                // Caustic lattice — two crossed wave-fields projected up the Y axis.
        const causticOrigin = vec3(p.x.mul(3.2), time.mul(0.28), p.z.mul(3.2))
        const causticA = mx_noise_float(causticOrigin)
        const causticB = mx_noise_float(causticOrigin.mul(1.63).add(vec3(11.7, 0, 4.3)))
        const causticRaw = causticA.add(causticB).mul(0.5).abs().oneMinus()
        const caustic = causticRaw.pow(5).mul(facing.mul(0.5).add(0.5))
                // Light shafts — long vertical interference bands.
        const shaftPhase = p.x.mul(7.5).add(p.z.mul(5.1))
          .add(mx_noise_float(p.mul(0.7)).mul(3.4))
        const shafts = filament(shaftPhase.sin(), 0.16)
                // Barnacles — spherical blisters scattered across the surface.
        const q = p.mul(31)
        const rnd = cellNoiseVec3(q)
        const rnd2 = cellNoiseVec3(q.floor().add(vec3(23, 92, 47)))
        const d = q.fract().sub(rnd.mul(0.5).add(0.25)).length()
        const fp = q.fwidth().length().max(0.002)
        const barnacle = d.smoothstep(0.16, fp.add(0.22).min(0.24)).oneMinus()
        const barnacleTint = mix(color('#e8e2cc'), color('#9c8c70'), rnd2.y)
                // Algae — fractal noise mottling the stone.
        const algae = mx_fractal_noise_float(p.mul(4.2), 3, 2, 0.55).mul(0.5).add(0.5)
                // Deep cold stone.
        const stoneDeep = mix(color('#050f14'), color('#16323c'), algae)
        const stoneShallow = mix(color('#1e4a54'), color('#3a6a72'), algae.mul(0.6))
        const stone = mix(stoneDeep, stoneShallow, facing.pow(0.6))
                // Silt accumulation in crevices.
        const silt = mx_noise_float(p.mul(18)).mul(0.4).add(0.6)
        const surfaceCol = mix(stone, barnacleTint, barnacle.mul(silt))
                // Bioluminescent motes hovering around the mesh.
        const motes = cellularPoints(p.mul(48).add(vec3(0, time.mul(0.06), 0)), 0.03, 0.18)
        this.colorNode = surfaceCol
        this.roughnessNode = barnacle.mul(-0.55).add(0.9)
        this.metalness = 0.04
        this.clearcoat = 0.45
        this.clearcoatRoughness = 0.35
        this.normalNode = proceduralNormal(barnacle.mul(0.7)
          .add(algae.mul(0.35))
          .add(mx_noise_float(p.mul(64)).mul(0.08)), 0.005)
        this.emissiveNode
          = color('#37c4d6').mul(caustic).mul(grazing.mul(0.4).add(0.6)).mul(0.42)
            .add(color('#5fe4ff').mul(shafts).mul(grazing.mul(0.5).add(0.3)).mul(0.16))
            .add(color('#00ffd4').mul(motes).mul(intimate.mul(0.7).add(0.35)).mul(2.4))
            .add(color('#1a8fa0').mul(rim).mul(0.08))
        break
      }
            // ============================================================
            //  2.  IRIDESCENT SCARAB
            //      Jewel-beetle carapace. Ridged chitin with structural
            //      colour that slides across the surface as you orbit;
            //      every edge gilded, every ridge burnished, every pore
            //      a soft amber pit.
            // ============================================================
      case 'iridescent_scarab': {
        const {p, facing, grazing, rim, near, intimate} = viewerFrame()
        const tube = uv()
                // Longitudinal carapace ridges running with the knot.
        const ridgeFreq = tube.x.mul(Math.PI * 2 * 42)
        const ridgeWobble = mx_noise_float(p.mul(2.3)).mul(1.8)
        const ridgeField = ridgeFreq.add(ridgeWobble).sin()
        const ridge = filament(ridgeField, 0.42)
                // Transverse segment lines around the cross-section.
        const segment = filament(tube.y.mul(Math.PI * 2 * 5).fract().sub(0.5), 0.055)
        const segmentFine = filament(tube.y.mul(Math.PI * 2 * 15).fract().sub(0.5), 0.045).mul(intimate)
                // Micro-pits using cellular noise.
        const pitQ = p.mul(90)
        const pitRnd = cellNoiseVec3(pitQ)
        const pitD = pitQ.fract().sub(pitRnd.mul(0.5).add(0.25)).length()
        const pitFp = pitQ.fwidth().length().max(0.002)
        const pit = pitD.smoothstep(0.12, pitFp.add(0.2)).oneMinus()
        const pitColor = mix(color('#f0c85a'), color('#5c3a08'), pitRnd.y)
                // Structural colour — view-locked hue sweep.
        const viewHue = facing.mul(0.72)
          .add(tube.x.mul(0.55))
          .add(grazing.mul(0.35))
          .add(mx_noise_float(p.mul(1.8)).mul(0.08))
        const irid = cosinePalette(viewHue, [0.42, 0.48, 0.38], [0.42, 0.42, 0.5], [1, 1, 1], [0.12, 0.32, 0.62])
                // Deep emerald body, amber flank, gold crease.
        const emerald = mix(color('#0a2a12'), color('#1f6a30'), facing.mul(0.4).add(0.3))
        const goldFlank = color('#c9a227')
        const gildedEdge = grazing.pow(2.4)
        const body = mix(emerald, goldFlank, gildedEdge.mul(0.85))
        const withIrid = mix(body, irid.mul(1.05), facing.pow(0.7).mul(0.55).add(0.25))
        const withPit = mix(withIrid, pitColor, pit.mul(0.55).mul(ridge.oneMinus().mul(0.6).add(0.4)))
        const ridgeHighlight = ridge.mul(0.4)
        this.colorNode = withPit
        this.metalnessNode = float(0.68).add(ridgeHighlight.mul(0.2)).add(gildedEdge.mul(0.25))
        this.roughnessNode = float(0.14)
          .add(ridge.mul(0.07))
          .add(pit.mul(0.22))
          .add(segment.mul(0.06))
        this.clearcoat = 1
        this.clearcoatRoughness = 0.035
        this.iridescence = 1
        this.iridescenceIOR = 1.85
        this.iridescenceThicknessNode = viewHue.mul(180).add(210)
        this.normalNode = proceduralNormal(ridge.mul(0.85)
          .add(pit.mul(0.35))
          .add(segment.mul(0.5))
          .add(segmentFine.mul(0.25)), 0.0035)
        this.emissiveNode
          = color('#ffe680').mul(gildedEdge.pow(1.6)).mul(near.mul(0.55).add(0.08)).mul(0.55)
            .add(color('#c9ffa1').mul(ridgeHighlight).mul(intimate).mul(0.12))
            .add(color('#f0c850').mul(rim).mul(0.08))
        break
      }
            // ============================================================
            //  3.  SOLAR PROMINENCE
            //      A living star-surface. Granulated convection, magnetic
            //      sunspots, incandescent prominences arcing off the rim
            //      as you circle, and a limb-darkened plasma that breathes
            //      with the noise field.
            // ============================================================
      case 'solar_prominence': {
        const {p, facing, grazing, rim, intimate} = viewerFrame()
        const tube = uv()
                // Convective granulation — cellular boiling surface.
        const granWarp = mx_noise_vec3(p.mul(3).add(time.mul(0.08))).mul(0.6)
        const granCell = mx_worley_noise_float(p.mul(24).add(granWarp).add(vec3(time.mul(0.18), time.mul(0.12), 0)), 1, 0)
        const granCell2 = mx_worley_noise_float(p.mul(11).sub(granWarp).sub(vec3(0, time.mul(0.22), 0)), 1, 0)
        const gran = granCell.smoothstep(0.1, 0.8).oneMinus().mul(0.55).add(granCell2.smoothstep(0.1, 0.8).oneMinus().mul(0.45))
                // Magnetic sunspots — cooler, darker.
        const spotField = mx_fractal_noise_float(p.mul(1.7).add(time.mul(0.02)), 3, 2, 0.55)
        const spotCore = spotField.smoothstep(0.32, 0.55).oneMinus()
        const penumbra = spotField.smoothstep(0.2, 0.42).mul(spotCore.oneMinus())
                // Magnetic loops — arcade of filamentary ribbons.
        const loopPhase = tube.x.mul(Math.PI * 2 * 7)
          .add(mx_noise_float(p.mul(2.4)).mul(2.5))
        const loops = opticalLine(loopPhase.sin().mul(0.5), 0.045)
        const loopsFine = opticalLine(loopPhase.mul(1.7).sin().mul(0.5), 0.03).mul(intimate)
                // Prominences — plasma ejections standing off the limb.
        const promField = mx_noise_float(p.mul(9).sub(vec3(0, time.mul(0.55), 0)))
        const promFlick = mx_noise_float(p.mul(22).add(vec3(time.mul(0.9), 0, 0)))
        const prominence = promField.abs().mul(2).oneMinus().clamp().pow(4)
          .add(promFlick.abs().mul(3).oneMinus().clamp().pow(6).mul(0.6))
          .mul(grazing.pow(1.4))
                // Plasma temperature ladder.
        const hot = gran.mul(0.65).add(0.35)
        const plasma = mix(color('#ff2400'), color('#ffcf6a'), hot)
        const plasmaDeep = mix(color('#560000'), plasma, spotCore)
        const penumbraCol = mix(plasma, color('#8a3a00'), penumbra.mul(0.7))
                // Limb darkening (edges cooler).
        const limb = facing.pow(0.55)
        this.colorNode = plasmaDeep.mul(limb.mul(0.55).add(0.55))
        this.roughnessNode = float(0.92)
          .sub(prominence.mul(0.35))
          .sub(loops.mul(0.15))
        this.metalness = 0
        this.clearcoat = 0.15
        this.clearcoatRoughness = 0.5
        this.normalNode = proceduralNormal(gran.mul(0.35).sub(spotCore.mul(0.15)).add(loops.mul(0.35)), 0.003)
        this.emissiveNode
          = plasma.mul(hot.mul(0.9).add(0.35)).mul(limb)
            .add(color('#ff7a10').mul(loops).mul(0.85))
            .add(color('#ff9a2a').mul(loopsFine).mul(0.5))
            .add(color('#fff4c8').mul(prominence).mul(2.6))
            .add(color('#ff5500').mul(rim).mul(grazing).mul(1.2))
            .add(color('#ffb066').mul(intimate).mul(0.12))
            .add(color('#3a0a00').mul(spotCore).mul(0.4))
            .add(penumbraCol.mul(penumbra).mul(0.35))
        break
      }
            // ============================================================
            //  4.  BISMUTH HOPPER
            //      A synthetic metal crystal grown in a lab, its surface a
            //      stair-step spiral of right-angled terraces. Each tread
            //      oxidised into a different interference colour; edges
            //      clean, chrome-bright, infinitely sharp.
            // ============================================================
      case 'bismuth_hopper': {
        const {p, facing, rim, near} = viewerFrame()
        const tube = uv()
                // Stair-step geometry: two orthogonal pitches make the spiral.
        const stepU = tube.x.mul(Math.PI * 2 * 9)
        const stepV = tube.y.mul(Math.PI * 2 * 5)
        const stepField = stepU.add(stepV).mul(0.5)
        const stepIdx = stepField.floor()
        const stepPhase = stepField.fract()
                // Terrace face and bevel edge.
        const tread = stepPhase.smoothstep(0.14, 0.22).oneMinus().oneMinus()
        const bevel = filament(stepPhase.sub(0.5), 0.035)
        const riser = stepPhase.smoothstep(0.85, 1).mul(stepPhase.smoothstep(0.05, 0).oneMinus())
                // Interference-film rainbow gated by view-angle and step index.
        const film = facing.mul(0.95).add(stepIdx.mul(0.075)).add(p.y.mul(0.25))
        const rainbow = cosinePalette(film, [0.5, 0.5, 0.5], [0.52, 0.5, 0.5], [1, 1, 1], [0, 0.33, 0.67])
        const rainbowDeep = cosinePalette(film.add(0.18), [0.45, 0.42, 0.5], [0.55, 0.55, 0.5], [1, 1, 1], [0.1, 0.4, 0.7])
                // Oxidation drift — where the tarnish is thick vs. thin.
        const ox = mx_noise_float(p.mul(2.6)).mul(0.35).add(0.6)
        const oxFine = mx_fractal_noise_float(p.mul(9), 3, 2, 0.5).mul(0.3).add(0.7)
                // Chrome base and oxidised film.
        const chrome = mix(color('#f0f4f8'), color('#7a8492'), tread.mul(0.55).add(0.25))
        const oxidised = mix(chrome, rainbow, ox.mul(0.85).add(0.15))
        const oxidised2 = mix(oxidised, rainbowDeep, oxFine.mul(0.4))
                // Bevel highlight — pure chrome.
        const bevelCol = color('#ffffff')
        this.colorNode = mix(oxidised2, bevelCol, bevel.mul(0.7))
        this.metalnessNode = float(0.9).sub(bevel.mul(0.1)).sub(riser.mul(0.25))
        this.roughnessNode = float(0.07)
          .add(bevel.mul(0.06))
          .add(riser.mul(0.28))
          .add(oxFine.mul(0.03))
        this.iridescence = 0.9
        this.iridescenceIOR = 1.6
        this.iridescenceThicknessNode = film.mul(260).add(240)
        this.clearcoat = 0.6
        this.clearcoatRoughness = 0.05
        this.normalNode = proceduralNormal(stepIdx.mul(0.015).add(bevel.mul(0.7)).add(riser.mul(0.4)), 0.009)
        this.emissiveNode
          = rainbow.mul(bevel).mul(near.mul(0.4).add(0.08)).mul(0.55)
            .add(rainbowDeep.mul(riser).mul(near.mul(0.2).add(0.05)).mul(0.2))
            .add(color('#88c8ff').mul(rim).mul(0.09))
        break
      }
            // ============================================================
            //  5.  AURORA CAGE
            //      A magnetic bottle caught mid-storm. Helical field lines
            //      incised into the surface, charged particles streaking
            //      along them, and vertical auroral curtains that shimmer
            //      green at the equator and burn violet near the poles.
            // ============================================================
      case 'aurora_cage': {
        const {p, facing, grazing, rim, near, intimate} = viewerFrame()
        const tube = uv()
                // Helical magnetic field lines.
        const fieldAngle = tube.x.mul(Math.PI * 2 * 14)
          .add(tube.y.mul(Math.PI * 2 * 3.5))
        const fieldWobble = mx_noise_float(p.mul(2.2).add(time.mul(0.12))).mul(1.2)
        const fieldLines = opticalLine(fieldAngle.add(fieldWobble).sin(), 0.055)
        const fieldLinesFine = opticalLine(fieldAngle.mul(2.7).add(fieldWobble.mul(0.6)).sin(), 0.04)
          .mul(intimate)
                // Charged particles — bright beads racing along field lines.
        const beadPhase = fieldAngle.sub(time.mul(3.4))
        const beadRaw = beadPhase.sin()
        const bead = beadRaw.abs().pow(32)
        const beadFlash = beadRaw.mul(0.5).add(0.5)
                // Aurora curtains — vertical sheets flickering overhead.
        const curtainPhase = tube.x.mul(Math.PI * 2 * 6)
          .add(mx_noise_float(p.mul(1.4).add(time.mul(0.09))).mul(2.6))
        const curtain = filament(curtainPhase.sin(), 0.22)
        const curtainFine = filament(curtainPhase.mul(3.4).sin(), 0.11).mul(intimate)
                // Falloff away from the "horizon" of the cage.
        const curtainFade = tube.y.sub(0.5).abs().mul(-3.2).exp()
                // Colour ladder: green low, cyan mid, violet high.
        const height = tube.y
        const auroraGreen = color('#00ff88')
        const auroraCyan = color('#44ffee')
        const auroraViolet = color('#c04dff')
        const auroraLow = mix(auroraGreen, auroraCyan, height.mul(2).clamp())
        const auroraHigh = mix(auroraCyan, auroraViolet, height.sub(0.5).mul(2).clamp())
        const auroraCol = mix(auroraLow, auroraHigh, height)
                // Dark ferrous cage.
        const cageDeep = color('#03060e')
        const cageMid = mix(cageDeep, color('#0a1430'), facing.mul(0.5).add(0.2))
        const auroraStrength = curtain.mul(curtainFade)
          .mul(facing.oneMinus().mul(0.4).add(0.6))
        this.colorNode = cageMid
        this.metalness = 0.35
        this.roughnessNode = float(0.18).sub(fieldLines.mul(0.06))
        this.clearcoat = 1
        this.clearcoatRoughness = 0.02
        this.normalNode = proceduralNormal(fieldLines.mul(0.2).add(mx_noise_float(p.mul(20)).mul(0.06)), 0.0018)
        this.emissiveNode
          = auroraCol.mul(auroraStrength).mul(2.1)
            .add(auroraCol.mul(curtainFine).mul(curtainFade).mul(1.1))
            .add(color('#88ffee').mul(fieldLines).mul(near.mul(0.5).add(0.25)))
            .add(color('#88ffee').mul(fieldLinesFine).mul(0.5))
            .add(color('#ffffff').mul(bead).mul(beadFlash)
              .mul(intimate.mul(0.8).add(0.4)).mul(3.2))
            .add(color('#44ffcc').mul(rim).mul(0.35))
            .add(color('#0a2440').mul(grazing).mul(0.2))
        break
      }
            // ============================================================
            //  6.  CLOCKWORK ORACLE
            //      An astrolabe turned inside-out. Gear teeth gnash along
            //      the tube, engraved rings march around the cross-section,
            //      patina pools in the crevices, and a spectral clock-hand
            //      sweeps the surface — brightest when you come close, as
            //      if time itself were dilated by your presence.
            // ============================================================
      case 'clockwork_oracle': {
        const {p, facing, rim, near, intimate} = viewerFrame()
        const tube = uv()
                // Gear teeth around the long axis.
        const teethPhase = tube.x.mul(Math.PI * 2 * 56)
        const teethRaw = teethPhase.fract().sub(0.5).abs().mul(2).pow(0.55)
        const teethMask = teethRaw.smoothstep(0.42, 0.72)
        const teethShadow = teethRaw.smoothstep(0.2, 0.5)
                // Concentric engraved rings on the cross-section.
        const ringIdx = tube.y.mul(7)
        const ringPhase = ringIdx.fract()
        const ringEdge = filament(ringPhase.sub(0.5), 0.06)
        const ringFine = filament(tube.y.mul(Math.PI * 2 * 22).fract().sub(0.5), 0.04)
          .mul(intimate)
                // Roman-numeral tick marks around the circuit.
        const tickPhase = tube.x.mul(Math.PI * 2 * 12)
        const tick = filament(tickPhase.fract().sub(0.5).mul(2), 0.07)
        const tickFine = filament(tube.x.mul(Math.PI * 2 * 60).fract().sub(0.5), 0.05)
          .mul(intimate)
                // Sweeping clock-hand — faster as you approach.
        const handSpeed = intimate.mul(1.4).add(0.35)
        const handAngle = time.mul(handSpeed)
        const handCoord = tube.x.mul(Math.PI * 2)
        const handDelta = handCoord.sub(handAngle).sin().abs()
        const handTrace = handDelta.smoothstep(0.012, 0.08).oneMinus()
                // Brass, patina, and wear layers.
        const brassBase = color('#7a5a24')
        const brassBright = color('#eacb7a')
        const brassHighlight = color('#fff3c4')
        const patina = color('#39584a')
        const ironDark = color('#25201a')
        const wear = mx_noise_float(p.mul(14)).mul(0.5).add(0.5)
        const patinaField = mx_fractal_noise_float(p.mul(6), 3, 2, 0.55).mul(0.5).add(0.5)
        const brass = mix(brassBase, brassBright, wear.mul(0.55).add(facing.mul(0.35)))
        const withPatina = mix(brass, patina, patinaField.mul(ringEdge.mul(0.5).add(0.25)).mul(0.7))
        const withTeeth = mix(withPatina, ironDark, teethShadow.mul(0.35))
        const withTick = mix(withTeeth, brassHighlight, tick.mul(0.4).add(ringEdge.mul(0.25)))
                // Temporal dilation pulse — driven by proximity.
        const dilation = intimate.mul(0.7).add(0.3)
        this.colorNode = withTick
        this.metalnessNode = float(0.86)
          .sub(patinaField.mul(0.35))
          .sub(teethShadow.mul(0.15))
        this.roughnessNode = float(0.28)
          .add(patinaField.mul(0.35))
          .add(teethShadow.mul(0.12))
          .add(ringEdge.mul(0.06))
        this.clearcoat = 0.4
        this.clearcoatRoughness = 0.09
        this.normalNode = proceduralNormal(teethMask.mul(0.55)
          .add(ringEdge.mul(0.35))
          .add(tick.mul(0.25))
          .add(tickFine.mul(0.15))
          .add(ringFine.mul(0.15)), 0.0028)
        this.emissiveNode
          = color('#ffcc44').mul(handTrace).mul(dilation).mul(1.9)
            .add(color('#88ddff').mul(rim).mul(dilation.mul(0.5)))
            .add(color('#ffae22').mul(tick).mul(near.mul(0.5).add(0.12)).mul(0.55))
            .add(color('#ffd070').mul(tickFine).mul(intimate).mul(0.4))
            .add(color('#3a2a10').mul(teethShadow).mul(0.4))
        break
      }
            // ============================================================
            //  7.  MYCELIUM BLOOM
            //      A damp, dark forest floor woven into a knot. Branching
            //      hyphae thread the substrate; every few seconds a wave
            //      of bioluminescence races the length of the tendril,
            //      setting clustered fungal nodes alight like tiny lanterns.
            // ============================================================
      case 'mycelium_bloom': {
        const {p, grazing, rim, intimate} = viewerFrame()
        const tube = uv()
                // Substrate — moss, humus, damp earth.
        const substrate = mx_fractal_noise_float(p.mul(7), 4, 2, 0.55).mul(0.5).add(0.5)
        const substrateFine = mx_noise_float(p.mul(42)).mul(0.4).add(0.6)
        const soil = mix(color('#060c04'), color('#1d2c10'), substrate)
        const soilRich = mix(soil, color('#2f3f18'), substrateFine.mul(0.35))
        const mossy = mix(soilRich, color('#415a1c'), substrate.pow(1.4).mul(0.7))
                // Branching hyphae threads.
        const hyphaeBase = mx_fractal_noise_float(p.mul(26).add(vec3(time.mul(0.02), 0, time.mul(0.03))), 3, 2, 0.5).mul(2.8)
        const hyphae = opticalLine(hyphaeBase.fract().sub(0.5), 0.035)
        const hyphaeCoarse = opticalLine(mx_noise_float(p.mul(14).add(mx_noise_float(p.mul(3)).mul(2))), 0.05)
                // Fungal nodes — clustered fruiting bodies.
        const nodeQ = p.mul(58)
        const nodeRnd = cellNoiseVec3(nodeQ)
        const nodeRnd2 = cellNoiseVec3(nodeQ.add(vec3(41.1, 17.3, 88.7)))
        const nodeDist = nodeQ.fract().sub(nodeRnd.mul(0.5).add(0.25)).length()
        const nodeFp = nodeQ.fwidth().length().max(0.002)
        const node = nodeDist.smoothstep(0.16, nodeFp.add(0.22)).oneMinus()
        const nodeSmall = nodeDist.smoothstep(0.22, nodeFp.add(0.3)).oneMinus()
          .mul(nodeRnd2.y.smoothstep(0.5, 0.6))
                // Travelling pulse — a slow, beautiful wave of bioluminescence.
        const pulsePrimary = tube.x.mul(Math.PI * 2).sub(time.mul(1.6))
          .sin().mul(0.5).add(0.5).pow(5)
        const pulseSecondary = tube.x.mul(Math.PI * 2 * 2).add(time.mul(1.05))
          .add(tube.y.mul(Math.PI * 2)).sin().mul(0.5).add(0.5).pow(7)
        const pulseTertiary = tube.x.mul(Math.PI * 2 * 3).sub(time.mul(0.65))
          .sin().mul(0.5).add(0.5).pow(9).mul(0.6)
                // Nearby floating spores.
        const sporeQ = p.mul(140).add(vec3(time.mul(0.08), 0, time.mul(-0.06)))
        const spore = mx_cell_noise_float(sporeQ)
        const spores = spore.smoothstep(0.965, 0.982)
                // Colour pair — cyan when the pulse passes, violet behind it.
        const bioCyan = color('#44ffdd')
        const bioViolet = color('#aa66ff')
        const bioPink = color('#ff88dd')
        const bioCol = mix(bioViolet, bioCyan, pulsePrimary)
        const bioEdge = mix(bioCyan, bioPink, pulseSecondary.mul(0.6))
        const nodeGlow = node.mul(pulsePrimary.mul(1.2).add(0.15))
        const hyphaeGlow = hyphae.mul(pulsePrimary.add(pulseSecondary.mul(0.5)).add(0.25))
        const coarseGlow = hyphaeCoarse.mul(pulseTertiary.add(0.2))
        this.colorNode = mossy
        this.metalness = 0.05
        this.roughnessNode = float(0.9).sub(node.mul(0.35)).sub(hyphae.mul(0.15))
        this.clearcoat = 0.28
        this.clearcoatRoughness = 0.45
        this.normalNode = proceduralNormal(hyphae.mul(0.35)
          .add(node.mul(0.75))
          .add(nodeSmall.mul(0.4))
          .add(substrate.mul(0.15)), 0.0035)
        this.emissiveNode
          = bioCol.mul(hyphaeGlow).mul(2.2)
            .add(bioEdge.mul(coarseGlow).mul(1.1))
            .add(bioCyan.mul(nodeGlow).mul(2.6))
            .add(bioViolet.mul(nodeSmall).mul(0.9))
            .add(color('#ffffff').mul(spores).mul(intimate.mul(0.8).add(0.4)).mul(1.6))
            .add(bioCyan.mul(grazing).mul(0.06))
            .add(color('#88ffcc').mul(rim).mul(0.14))
        break
      }
            // ============================================================
            //  8.  PRISMATIC HAUNT
            //      A cold, faceted crystal knot half-here and half-not.
            //      Each facet refuses to admit its colour until you move,
            //      then splits the incoming light into a rippling spectrum
            //      that migrates across the surface with every step you take.
            // ============================================================
      case 'prismatic_haunt': {
        const {p, facing, grazing, rim, near, intimate} = viewerFrame()
        const tube = uv()
                // Facet lattice — discretised into hard cells.
        const facetU = tube.x.mul(Math.PI * 2 * 22).floor()
        const facetV = tube.y.mul(Math.PI * 2 * 7).floor()
        const facetSeed = facetU.mul(1.37).add(facetV.mul(53.71))
        const facetRnd = cellNoiseVec3(vec3(facetSeed, facetV.mul(0.71), 0))
        const facetRnd2 = cellNoiseVec3(vec3(facetSeed.add(11.3), facetV.add(29.1), 3.7))
                // Edge network between facets.
        const edgeU = filament(tube.x.mul(Math.PI * 2 * 22).fract().sub(0.5), 0.018)
        const edgeV = filament(tube.y.mul(Math.PI * 2 * 7).fract().sub(0.5), 0.018)
        const facetEdge = edgeU.max(edgeV)
        const facetEdgeFine = filament(tube.x.mul(Math.PI * 2 * 44).add(tube.y.mul(Math.PI * 2 * 3)).fract().sub(0.5), 0.015).mul(intimate)
                // View-driven dispersion — the spectrum slides with the eye.
        const dispersionPhase = facing.mul(3.2)
          .add(tube.x.mul(2.1))
          .add(tube.y.mul(1.4))
          .add(facetRnd.x.mul(0.4))
        const spectrumA = cosinePalette(dispersionPhase, [0.5, 0.5, 0.5], [0.55, 0.55, 0.55], [1, 1, 1], [0, 0.33, 0.67])
        const spectrumB = cosinePalette(dispersionPhase.add(0.15).add(grazing.mul(0.4)), [0.5, 0.5, 0.5], [0.55, 0.55, 0.55], [1, 1, 1], [0.05, 0.38, 0.72])
        const chroma = spectrumA.add(spectrumB).mul(0.5)
                // Facet interior — cool glass, tinted by the dispersion.
        const glassCore = color('#dfeeff')
        const glassTint = mix(glassCore, chroma, grazing.mul(0.7).add(0.28))
                // Random per-facet brightness.
        const facetBright = facetRnd2.y.mul(0.6).add(0.55)
        const facetTinted = glassTint.mul(facetBright)
                // Intimate inner glow when the viewer crowds the surface.
        const innerGlow = intimate.mul(facing.pow(1.6))
                // Sharp facet tilt for procedural normal.
        const facetTilt = facetRnd.mul(2).sub(1).dot(vec3(0.577_350_269)).mul(0.55)
        this.colorNode = facetTinted
        this.transmission = 0.55
        this.thickness = 0.5
        this.ior = 1.72
        this.dispersion = 0.65
        this.attenuationColor.set('#8fd6ff')
        this.attenuationDistance = 0.85
        this.metalness = 0
        this.roughnessNode = float(0.045)
          .add(facetEdge.mul(0.25))
          .add(facetEdgeFine.mul(0.06))
        this.clearcoat = 1
        this.clearcoatRoughness = 0.02
        this.iridescence = 0.75
        this.iridescenceIOR = 1.9
        this.iridescenceThicknessNode = dispersionPhase.mul(115).add(265)
        this.normalNode = proceduralNormal(facetTilt.mul(0.14)
          .add(mx_noise_float(p.mul(80)).mul(0.05))
          .add(facetEdge.mul(0.35))
          .add(facetEdgeFine.mul(0.12)), 0.006)
        this.emissiveNode
          = chroma.mul(facetEdge).mul(near.mul(0.55).add(0.45)).mul(0.75)
            .add(chroma.mul(facetEdgeFine).mul(0.4))
            .add(color('#ffffff').mul(innerGlow).mul(0.55))
            .add(spectrumA.mul(rim).mul(0.7))
            .add(spectrumB.mul(grazing.pow(3)).mul(0.35))
            .add(color('#88c8ff').mul(facing.pow(6)).mul(0.15))
        break
      }
    }
  }
}
