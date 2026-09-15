/**
 * KnotMaterialPremium.ts
 *
 * Independent procedural finishes for Three r186 / native WebGPU.
 * Requires the supplied TorusKnotGeometry(0.45, 0.13, 256, 64, 2, 3)
 * with its seam-joined tangents.
 *
 * No additional textures, uniforms, render passes, or update hooks.
 *
 * The sculpted finishes displace inward only. Their vertex graphs are
 * camera-independent, preserving the original bounds and keeping shadow
 * passes consistent. Screen derivatives are confined to fragment graphs.
 */

import type {Node, Texture} from 'three/webgpu'

import * as tsl from 'three/tsl'
import {bitangentView, cameraPosition, color, float, Fn as fn, mix, modelViewMatrix, modelWorldMatrixInverse, mx_atan2, mx_noise_float, negateOnBackSide, normalLocal, normalViewGeometry, positionGeometry, positionView, positionViewDirection, positionWorld, select, tangentView, time, transformNormalToView, uv, varying, vec2, vec3, vec4} from 'three/tsl'
import {MeshPhysicalNodeMaterial} from 'three/webgpu'

const TAU = Math.PI * 2
const SQRT3 = Math.sqrt(3)
// Some @types/three releases lag behind the runtime export.
const cellNoiseVec3 = (tsl as typeof tsl & {
  mx_cell_noise_vec3: (position: Node<'vec3'>) => Node<'vec3'>
}).mx_cell_noise_vec3
function viewerFrame(normal: Node<'vec3'> = normalViewGeometry) {
  const N = normal.normalize()
  const V = positionViewDirection
  const T = tangentView.normalize()
  const B = vec3(bitangentView as unknown as Node<'vec3'>).normalize()
  const cameraLocal = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz
  const view = cameraLocal.sub(positionGeometry).normalize()
  const facing = N.dot(V).abs().clamp()
  const distance = positionView.length()
  return {
    p: positionGeometry,
    N,
    V,
    T,
    B,
    view,
    facing,
    grazing: facing.oneMinus(),
    near: distance.smoothstep(1.1, 5.2).oneMinus(),
    intimate: distance.smoothstep(0.85, 2.65).oneMinus(),

        // Approximate metres-to-UV conversion for this particular knot.
        // The denominator is bounded so grazing parallax cannot explode.
    uvSlope: vec2(V.dot(T), V.dot(B))
      .div(vec2(7.2, TAU * 0.13))
      .div(facing.max(0.22)),
  }
}
function visibility(footprint: Node<'float'>, start = 0.3, end = 1.1) {
  return footprint.smoothstep(start, end).oneMinus()
}
/** A zero-mean oscillation that converges to its average when unresolved. */
function filteredWave(phase: Node<'float'>) {
  return phase.cos().mul(visibility(phase.fwidth(), 0.6, 3.2))
}
function line(field: Node<'float'>, width: number) {
  return field.abs()
    .smoothstep(width, field.fwidth().max(0.00001).add(width))
    .oneMinus()
}
function disk(radius: Node<'float'>, size: number) {
  const footprint = radius.fwidth().max(0.00001)
  return radius
    .smoothstep(footprint.negate().add(size), footprint.add(size))
    .oneMinus()
}
function annulus(radius: Node<'float'>, inner: number, outer: number) {
  return disk(radius, outer).mul(disk(radius, inner).oneMinus())
}
/**
 * Height is expressed in object-scale metres, rather than arbitrary
 * normal-map RGB values. Works with both the original and sculpted normals.
 */
function bumpNormal(height: Node<'float'>, normal: Node<'vec3'> = normalViewGeometry) {
  const N = normal.normalize()
  const dx = positionView.dFdx()
  const dy = positionView.dFdy()
  const rx = dy.cross(N)
  const ry = N.cross(dx)
  const determinant = dx.dot(rx)
  const gradient = rx.mul(height.dFdx())
    .add(ry.mul(height.dFdy()))
    .mul(determinant.sign())
    .div(determinant.abs().max(1e-12))
  return N.sub(gradient).normalize()
}
function wrapCell(cell: Node<'vec2'>, period: Node<'vec2'>) {
  return cell.mod(period).add(period).mod(period)
}
/**
 * Periodic, jittered Voronoi cells.
 *
 * xy: vector from the sample to its nearest centre
 * z:  stable cell identity
 * w:  approximate distance from a Voronoi boundary
 *
 * Explicit variables keep the nine-cell search compact. Selection is
 * branchless, and derivatives are taken only after the search completes.
 */
const packedCells = fn(([
  q,
  period,
]: [
  Node<'vec2'>,
  Node<'vec2'>,
]) => {
  const base = q.floor().toVar()
  const fraction = q.fract().toVar()
  const first = float(1e6).toVar()
  const second = float(1e6).toVar()
  const nearest = vec2(0).toVar()
  const identity = float(0).toVar()
  for (let y = -1; y <= 1; y++) {
    for (let x = -1; x <= 1; x++) {
      const offset = vec2(x, y)
      const id = wrapCell(base.add(offset), period)
      const random = cellNoiseVec3(vec3(id, 7.19))
      const delta = offset
        .add(random.xy.mul(0.7).add(0.15))
        .sub(fraction)
      const distanceSquared = delta.dot(delta).toVar()
      const nearer = distanceSquared.lessThan(first).toVar()
      second.assign(select(nearer, first, second.min(distanceSquared)))
      nearest.assign(select(nearer, delta, nearest))
      identity.assign(select(nearer, random.z, identity))
      first.assign(first.min(distanceSquared))
    }
  }
  return vec4(nearest, identity, second.sqrt().sub(first.sqrt()).max(0))
})
// ---------------------------------------------------------------------------
// Geometry reconstruction: matches the supplied TorusKnotGeometry parameters.
// ---------------------------------------------------------------------------
const knotCurve = fn(([angle]: [Node<'float'>]) => {
  const phase = angle.mul(1.5)
  const radius = phase.cos().add(2).mul(0.225)
  return vec3(radius.mul(angle.cos()), radius.mul(angle.sin()), phase.sin().mul(0.225))
})
const knotShell = fn(([
  tube,
  inset,
]: [
  Node<'vec2'>,
  Node<'float'>,
]) => {
  const angle = tube.x.mul(Math.PI * 4)
  const centre = knotCurve(angle)
  const next = knotCurve(angle.add(0.01))
  const tangent = next.sub(centre)
  const binormal = tangent.cross(next.add(centre)).normalize()
  const frameNormal = binormal.cross(tangent).normalize()
  const around = tube.y.mul(TAU)
  const outward = frameNormal.mul(around.cos().negate())
    .add(binormal.mul(around.sin()))
  return centre.add(outward.mul(inset.add(0.13)))
})
function ferroFields(tube: Node<'vec2'>) {
  const U = tube.x.mul(TAU * 28).add(time.mul(0.12))
  const V = tube.y.mul(TAU * 4)
    // Three reciprocal-lattice waves create a hexagonal Rosensweig pattern.
  const lattice = U.add(V.mul(0.5)).cos()
    .add(U.sub(V.mul(0.5)).cos())
    .add(V.cos())
    .add(1.5)
    .div(4.5)
    .clamp()
  const tip = lattice.pow(4.2)
  const pulse = time.mul(0.45)
    .add(tube.x.mul(TAU * 2))
    .sin()
    .mul(0.06)
    .add(0.94)
  return {
    U,
    V,
    tip,
    inset: tip.oneMinus().mul(-0.048).mul(pulse),
  }
}
const ferroPosition = fn(([tube]: [Node<'vec2'>]) => {
  return knotShell(tube, ferroFields(tube).inset)
})
function roundedTriangle(phase: Node<'float'>) {
  return phase.sin().mul(0.975).asin().div(Math.asin(0.975))
}
function foldFields(tube: Node<'vec2'>) {
  const V = tube.y.mul(TAU * 4)
  const zigzag = roundedTriangle(V)
  const U = tube.x.mul(TAU * 24).add(zigzag.mul(1.2))
  const pleat = roundedTriangle(U)
  return {
    U,
    V,
    pleat,
    zigzag,
    inset: pleat.mul(0.017).add(zigzag.mul(0.006)).sub(0.025),
  }
}
const foldedPosition = fn(([tube]: [Node<'vec2'>]) => {
  return knotShell(tube, foldFields(tube).inset)
})
function chladniField(tube: Node<'vec2'>) {
  const U = tube.x.mul(TAU)
  const V = tube.y.mul(TAU)
  const balance = time.mul(0.09).sin().mul(0.12).add(0.8)
  return U.mul(18).sin().mul(V.mul(2).sin())
    .sub(U.mul(12).cos().mul(V.mul(3).sin()).mul(balance))
    .add(U.mul(6).sin().mul(V.cos()).mul(0.2))
}
function watchGear(point: Node<'vec2'>, radius: number, teeth: number, rotation: Node<'float'>) {
  const r = point.length()
  const theta = (mx_atan2(point.y, point.x.add(0.000001)) as unknown as Node<'float'>).sub(rotation)
  const footprint = point.fwidth().length().max(0.00001)
  const angularFootprint = footprint.div(r.max(radius * 0.2))
  const toothVisibility = visibility(angularFootprint.mul(teeth), 0.7, 2.7)
  const teethWave = theta.mul(teeth).cos().smoothstep(-0.2, 0.2)
  const toothRadius = mix(float(radius * 0.94), float(radius * 1.06), teethWave)
  const edge = mix(float(radius), toothRadius, toothVisibility)
  const silhouette = r
    .smoothstep(edge.sub(footprint), edge.add(footprint))
    .oneMinus()
  const spokeVisibility = visibility(angularFootprint.mul(6), 0.35, 1.8)
  const spokes = mix(float(0.16), theta.mul(6).cos().smoothstep(0.85, 0.96), spokeVisibility)
  const rim = r.smoothstep(radius * 0.64, radius * 0.76)
  const hub = disk(r, radius * 0.23)
  return {
    r,
    theta,
    mask: silhouette.mul(rim.max(hub).max(spokes)),
    engraving: line(r.sub(radius * 0.84), radius * 0.018),
  }
}

export const knotFinishes = [
  {
    id: 'ferrothorn',
    title: 'Ferrothorn',
    accent: '#98b8c4',
  },
  {
    id: 'luthiers_dream',
    title: "Luthier's Dream",
    accent: '#e6ad61',
  },
  {
    id: 'chladni_sands',
    title: 'Chladni Sands',
    accent: '#ead8aa',
  },
  {
    id: 'blushing_matter',
    title: 'Blushing Matter',
    accent: '#f66d8b',
  },
  {
    id: 'ephemeral_foam',
    title: 'Ephemeral Assembly',
    accent: '#a3eadd',
  },
  {
    id: 'cataphote_rouge',
    title: 'Cataphote Rouge',
    accent: '#f7472c',
  },
  {
    id: 'folded_silence',
    title: 'Folded Silence',
    accent: '#e9dfc9',
  },
  {
    id: 'horologists_paradox',
    title: "Horologist's Paradox",
    accent: '#d9b16b',
  },
] as const

export type KnotFinish = typeof knotFinishes[number]['id']

export class KnotMaterial extends MeshPhysicalNodeMaterial {
  constructor(finish: KnotFinish, environment: Texture) {
    super({
      envMap: environment,
      envMapIntensity: 0.95,
    })
    this.name = finish
    switch (finish) {
            // ---------------------------------------------------------------
            // Opaque magnetic fluid. Real moving peaks, not painted spikes.
            // Near inspection exposes capillary striations between the peaks.
            // ---------------------------------------------------------------
      case 'ferrothorn': {
        const tube = uv()
        const {U, V, tip} = ferroFields(tube)
        this.positionNode = ferroPosition(tube)
        const e = 0.0002
        const du = ferroPosition(tube.add(vec2(e, 0)))
          .sub(ferroPosition(tube.sub(vec2(e, 0))))
        const dv = ferroPosition(tube.add(vec2(0, e)))
          .sub(ferroPosition(tube.sub(vec2(0, e))))
        const sculptedNormal = varying(transformNormalToView(du.cross(dv).normalize())).normalize()
        const {p, near, grazing} = viewerFrame(sculptedNormal)
        const microVisibility = visibility(p.mul(75).fwidth().length()).mul(near)
        const capillaryPhase = U.mul(4)
          .add(V.mul(4))
          .add(V.sin().mul(0.8))
          .add(time.mul(0.25))
        const microHeight = filteredWave(capillaryPhase)
          .mul(near)
          .mul(0.00006)
          .add(mx_noise_float(p.mul(75))
            .mul(microVisibility)
            .mul(0.000025))
        this.envMapIntensity = 1.3
        this.colorNode = mix(color('#111d23'), color('#8ba4ad'), tip.pow(0.6).mul(near.mul(0.5).add(0.28)))
        this.metalness = 0.92
        this.roughnessNode = float(0.145)
          .add(tip.mul(0.035))
          .add(grazing.mul(0.035))
        this.clearcoat = 0.85
        this.clearcoatRoughness = 0.032
        this.normalNode = negateOnBackSide(bumpNormal(microHeight, sculptedNormal))
        this.clearcoatNormalNode = this.normalNode
        this.aoNode = tip.oneMinus().pow(3).mul(-0.28).add(1)
        break
      }
            // ---------------------------------------------------------------
            // Carved, figured timber with directional fibre reflection.
            // The curl reverses from luminous to dark as the viewer moves;
            // end grain, vessels and medullary rays emerge at close range.
            // ---------------------------------------------------------------
      case 'luthiers_dream': {
        const {p, view, V, T, B, near, grazing} = viewerFrame()
        const coarse = mx_noise_float(p.mul(vec3(3.4, 1.8, 3.4)))
        const curlPhase = p.y.mul(24)
          .add(mx_noise_float(p.mul(vec3(5, 1.5, 5))).mul(2.2))
        const growthPoint = vec2(p.x.add(curlPhase.sin().mul(0.055)), p.z.add(p.y.mul(11).sin().mul(0.04)))
        const radial = growthPoint.length()
        const grainPhase = radial.mul(140)
          .add(mx_noise_float(p.mul(vec3(8, 1.2, 8))).mul(2.6))
        const rawLatewood = grainPhase.cos()
          .mul(0.5)
          .add(0.5)
          .smoothstep(0.6, 0.93)
        const latewood = mix(float(0.3), rawLatewood, visibility(grainPhase.fwidth(), 0.7, 3))
        const fibreAxis = vec3(curlPhase.cos().mul(0.28).add(0.12), 1, p.y.mul(17).add(coarse.mul(2)).sin().mul(0.22)).normalize()
        const fibreView = modelViewMatrix
          .mul(vec4(fibreAxis, 0))
          .xyz
          .normalize()
        const fibreUV = vec2(fibreView.dot(T), fibreView.dot(B))
        const fibreLength = fibreUV.length()
        const chatoyance = fibreView.dot(V)
          .abs()
          .clamp()
          .oneMinus()
          .pow(7)
                // A shallow buried figure supplies real directional parallax,
                // independently of the surface's growth-ring pattern.
        const buried = p.sub(view.mul(grazing.mul(0.01).add(0.012)))
        const figure = mx_noise_float(buried.mul(vec3(7, 19, 7))).mul(0.5).add(0.5)
        const endGrain = normalLocal.normalize()
          .dot(fibreAxis)
          .abs()
          .clamp()
        const vesselQ = p.mul(vec3(200, 12, 200))
        const vesselVisibility = visibility(vesselQ.fwidth().length()).mul(near)
        const vessels = mx_noise_float(vesselQ)
          .smoothstep(0.24, 0.52)
          .mul(vesselVisibility)
        const rayAngle = mx_atan2(growthPoint.y, growthPoint.x.add(0.000001)) as unknown as Node<'float'>
        const rayPhase = rayAngle.mul(48).add(radial.mul(14))
        const rayVisibility = visibility(growthPoint.fwidth().length()
          .div(radial.max(0.03))
          .mul(48), 0.7, 3).mul(near)
        const rays = rayPhase.cos()
          .smoothstep(0.9, 0.99)
          .mul(rayVisibility)
        const timber = mix(color('#e8b878'), color('#623016'), latewood.mul(0.76).add(0.08))
        const figuredTimber = timber
          .mul(chatoyance.mul(0.55).add(0.7))
          .mul(figure.mul(0.18).add(0.91))
          .mul(endGrain.mul(-0.18).add(1))
        this.colorNode = mix(figuredTimber, color('#f4d79a'), rays.mul(0.24)).mul(vessels.mul(-0.3).add(1))
        this.metalness = 0
        this.ior = 1.47
        this.specularIntensity = 0.7
        this.specularColorNode = color('#fff1cf')
        this.roughnessNode = float(0.3)
          .add(endGrain.mul(0.08))
          .add(vessels.mul(0.1))
          .sub(chatoyance.mul(0.055))
                // r186 anisotropyNode is a tangent-space direction * strength.
        this.anisotropy = 0.72
        this.anisotropyNode = fibreUV
          .div(fibreLength.max(0.0001))
          .mul(fibreLength.smoothstep(0.08, 0.7))
          .mul(0.72)
        this.clearcoat = 0.15
        this.clearcoatRoughness = 0.24
        this.normalNode = negateOnBackSide(bumpNormal(filteredWave(grainPhase).mul(0.00016)
          .sub(vessels.mul(0.00028))
          .add(rays.mul(0.00008))))
        break
      }
            // ---------------------------------------------------------------
            // Pale mineral sand resting on a blue resonating membrane.
            // Slowly changing standing waves reorganize the powder. Oblique
            // views reveal piled dunes; close views resolve individual grains.
            // ---------------------------------------------------------------
      case 'chladni_sands': {
        const tube = uv()
        const {N, T, B, near, uvSlope} = viewerFrame()
        const originalField = chladniField(tube)
        const originalPile = originalField.pow(2).mul(-70).exp()
        const raisedTube = tube.add(uvSlope.mul(originalPile.mul(0.0035)))
        const field = chladniField(raisedTube)
        const pile = field.pow(2).mul(-60).exp()
        const sandMask = field.abs().smoothstep(0.07, field.fwidth().mul(0.65).add(0.12)).oneMinus()
        const grainPeriod = vec2(2300, 260)
        const grainQ = raisedTube.mul(grainPeriod)
        const random = cellNoiseVec3(vec3(wrapCell(grainQ.floor(), grainPeriod), 23.4))
        const grainFootprint = grainQ.fwidth().length()
        const grainVisibility = visibility(grainFootprint, 0.25, 1.15).mul(near)
        const grainDistance = grainQ.fract()
          .sub(random.xy.mul(0.3).add(0.35))
          .length()
        const grainShape = grainDistance.smoothstep(0.31, grainFootprint.mul(0.3).add(0.43)).oneMinus()
                // Unresolved powder converges to an average coverage instead
                // of disappearing or turning into subpixel glitter.
        const coverage = sandMask.mul(mix(float(0.73), grainShape.mul(0.6).add(0.4), grainVisibility))
        const sandTint = mix(color('#d5b67b'), color('#fff0cb'), random.z.mul(0.55).add(0.35))
        const membraneWave = tube.x.mul(TAU * 8).sin()
          .mul(tube.y.mul(TAU * 2).sin())
          .mul(0.00005)
        const pileNormal = bumpNormal(pile.mul(0.0033).add(membraneWave), N)
        const facetStrength = grainVisibility.mul(coverage).mul(0.5)
        const grainNormal = pileNormal
          .add(T.mul(random.x.sub(0.5)).mul(facetStrength))
          .add(B.mul(random.y.sub(0.5)).mul(facetStrength))
          .normalize()
        const quartz = random.z.smoothstep(0.96, 0.99)
          .mul(grainVisibility)
          .mul(coverage)
        this.colorNode = mix(color('#082b4b'), sandTint, coverage)
        this.metalnessNode = coverage.oneMinus().mul(0.78)
        this.roughnessNode = mix(float(0.26), float(0.82), coverage).sub(quartz.mul(0.6))
        this.ior = 1.55
        this.clearcoat = 0.28
        this.clearcoatNode = coverage.oneMinus().mul(0.28)
        this.clearcoatRoughness = 0.12
        this.clearcoatNormalNode = normalViewGeometry
        this.normalNode = negateOnBackSide(grainNormal)
        this.aoNode = sandMask.mul(-0.15).add(1)
        break
      }
            // ---------------------------------------------------------------
            // Thermochromic elastomer that appears to become self-conscious.
            // An approaching observer warms the facing surface from cool
            // smoke to rose; intimate viewing raises almost imperceptible
            // gooseflesh and reveals a shallow pigment-capillary network.
            // ---------------------------------------------------------------
      case 'blushing_matter': {
        const {p, view, facing, grazing, near, intimate} = viewerFrame()
        const mottling = mx_noise_float(p.mul(4.2))
        const pulse = time.mul(0.72)
          .add(p.y.mul(5))
          .sin()
          .mul(0.025)
          .mul(near)
        const heat = near.mul(0.66)
          .add(facing.pow(3).mul(near).mul(0.45))
          .add(mottling.mul(0.07))
          .add(pulse)
        const activation = heat.smoothstep(0.34, 0.78)
        const flushed = heat.smoothstep(0.67, 1.08)
        const warmPigment = mix(color('#f1b1a4'), color('#d73558'), flushed)
        const body = mix(color('#a5b3c0'), warmPigment, activation)
        const under = p.sub(view.mul(grazing.mul(0.004).add(0.006)))
        const capillaryField = mx_noise_float(under.mul(24))
          .add(mx_noise_float(under.mul(51)).mul(0.32))
        const capillaries = line(capillaryField, 0.008)
          .mul(intimate)
          .mul(activation)
          .mul(0.13)
        const poreQ = p.mul(vec3(160, 120, 160))
        const poreVisibility = visibility(poreQ.fwidth().length()).mul(near)
        const pores = mx_noise_float(poreQ)
          .smoothstep(0.25, 0.6)
        const bumpQ = p.mul(70)
        const gooseflesh = mx_noise_float(bumpQ)
          .mul(0.5)
          .add(0.5)
          .clamp()
          .pow(6)
          .mul(visibility(bumpQ.fwidth().length()))
          .mul(intimate)
        this.colorNode = mix(body, color('#96314d'), capillaries).mul(pores.mul(poreVisibility).mul(-0.045).add(1))
        this.metalness = 0
        this.ior = 1.41
        this.specularIntensity = 0.55
        this.roughnessNode = float(0.6)
          .sub(activation.mul(0.08))
          .add(pores.mul(poreVisibility).mul(0.04))
        this.retroreflectivityNode = activation.mul(0.08).add(0.12)
        this.clearcoat = 0.12
        this.clearcoatRoughness = 0.28
        this.normalNode = negateOnBackSide(bumpNormal(pores.mul(poreVisibility).mul(-0.0001)
          .add(gooseflesh.mul(0.0008))))
                // A deliberately small wrap term suggests sub-surface
                // scattering without making the elastomer look luminous.
        this.emissiveNode = color('#ffad86')
          .mul(grazing.pow(3))
          .mul(activation.mul(0.015).add(0.025))
          .mul(near)
        break
      }
            // ---------------------------------------------------------------
            // A packed assembly of soap films and liquid Plateau borders.
            // Two membrane depths separate under parallax. Thin-film colour
            // comes from the physical iridescence model, not a rainbow ramp.
            // ---------------------------------------------------------------
      case 'ephemeral_foam': {
        const tube = uv()
        const {p, N, T, B, near, uvSlope} = viewerFrame()
        const period = vec2(72, 8)
        const q = tube.mul(period)
        const cells = packedCells(q, period)
        const cellVisibility = visibility(q.fwidth().length(), 0.22, 0.95)
        const rawBorder = cells.w.smoothstep(0.016, cells.w.fwidth().add(0.045)).oneMinus()
        const border = mix(float(0.18), rawBorder, cellVisibility)
        const interior = border.oneMinus()
        const backQ = q
          .sub(uvSlope.mul(period).mul(0.03))
          .add(vec2(0.37, 0.19))
        const backCells = packedCells(backQ, period)
        const backBorder = backCells.w.smoothstep(0.012, backCells.w.fwidth().add(0.033)).oneMinus()
          .mul(near)
          .mul(visibility(backQ.fwidth().length(), 0.25, 0.9))
        const capXY = cells.xy.mul(1.22)
        const capZ = float(1)
          .sub(capXY.dot(capXY))
          .max(0.1)
          .sqrt()
        const capNormal = N.mul(capZ)
          .sub(T.mul(capXY.x))
          .sub(B.mul(capXY.y))
          .normalize()
        const foamNormal = mix(N, capNormal, interior.mul(cellVisibility)).normalize()
        const drainage = positionWorld.y.mul(21)
          .sub(time.mul(0.28))
          .add(cells.z.mul(TAU))
          .sin()
        const currents = mx_noise_float(p.mul(12).add(vec3(0, time.mul(-0.03), 0)))
        const filmThickness = cells.z.mul(450)
          .add(drainage.mul(90))
          .add(currents.mul(60))
          .add(210)
          .clamp(80, 1100)
        this.envMapIntensity = 1.2
        this.colorNode = mix(color('#d5ebe4'), color('#ffffff'), border.mul(0.65).add(backBorder.mul(0.25)))
        this.metalness = 0
        this.roughnessNode = float(0.035)
          .add(border.mul(0.11))
          .add(cellVisibility.oneMinus().mul(0.17))
                // Air / water film / air: the low bulk IOR is intentional.
                // Using the same IOR for the film and substrate would largely
                // eliminate the interference responsible for soap colours.
        this.ior = 1.025
        this.iorNode = border.mul(0.308).add(1.025)
        this.iridescence = 1
        this.iridescenceIOR = 1.34
        this.iridescenceNode = interior
          .mul(cellVisibility)
          .mul(0.96)
        this.iridescenceThicknessNode = mix(float(440), filmThickness, cellVisibility)
        this.transmission = 0.92
        this.transmissionNode = border.mul(-0.46).add(0.94)
        this.thicknessNode = interior.mul(0.028).add(0.006)
        this.attenuationColor.set('#e3fff5')
        this.attenuationDistance = 1.3
        this.normalNode = negateOnBackSide(foamNormal)
        this.aoNode = border.mul(-0.12).add(1)
        break
      }
            // ---------------------------------------------------------------
            // Deep-red corner-cube retroreflectors sealed beneath clear resin.
            // Each cell contains three mutually perpendicular optical faces.
            // Moving past the light produces abrupt, coherent return flashes;
            // close inspection exposes fine machining on the individual faces.
            // ---------------------------------------------------------------
      case 'cataphote_rouge': {
        const tube = uv()
        const {N, T, B, facing, near} = viewerFrame()
        const q = tube.mul(vec2(84, SQRT3 * 6))
        const pitch = vec2(1, SQRT3)
        const halfPitch = pitch.mul(0.5)
        const a = q.mod(pitch).sub(halfPitch)
        const b = q.add(halfPitch).mod(pitch).sub(halfPitch)
        const local = select(a.dot(a).lessThan(b.dot(b)), a, b)
        const footprint = q.fwidth().length().max(0.00001)
        const facetVisibility = visibility(footprint, 0.16, 0.7)
        const edgeDistance = float(0.5).sub(local.x.abs().max(local.x.abs().mul(0.5)
          .add(local.y.abs().mul(SQRT3 * 0.5))))
        const inside = edgeDistance.smoothstep(footprint.mul(0.35).add(0.009), footprint.mul(0.65).add(0.026))
        const sectorA = local.y
        const sectorB = local.x.mul(SQRT3 * 0.5)
          .sub(local.y.mul(0.5))
        const sectorC = local.x.mul(-SQRT3 * 0.5)
          .sub(local.y.mul(0.5))
        const directionBC = select(sectorB.greaterThan(sectorC), vec2(SQRT3 * 0.5, -0.5), vec2(-SQRT3 * 0.5, -0.5))
        const faceDirection = select(sectorA.greaterThan(sectorB.max(sectorC)), vec2(0, 1), directionBC)
        const largest = sectorA.max(sectorB).max(sectorC)
        const smallest = sectorA.min(sectorB).min(sectorC)
        const middle = sectorA.add(sectorB).add(sectorC)
          .sub(largest)
          .sub(smallest)
        const sectorGap = largest.sub(middle).max(0)
        const creaseFilter = sectorGap.smoothstep(footprint.mul(0.25), footprint.mul(0.9))
        const cubeNormal = N.mul(1 / Math.sqrt(3))
          .sub(T.mul(faceDirection.x).mul(Math.sqrt(2 / 3)))
          .sub(B.mul(faceDirection.y).mul(Math.sqrt(2 / 3)))
          .normalize()
        const normal = mix(N, cubeNormal, inside.mul(facetVisibility).mul(creaseFilter)).normalize()
        const acceptance = facing.smoothstep(0.15, 0.62)
        const faceTint = faceDirection.x.mul(0.12)
          .add(faceDirection.y.mul(0.05))
          .add(0.82)
        const toolMarks = filteredWave(local.dot(faceDirection).mul(TAU * 9)).mul(near)
        this.envMapIntensity = 1.05
        this.colorNode = mix(color('#0c1015'), color('#e13e29').mul(faceTint), inside)
        this.metalnessNode = inside.mul(0.05)
        this.ior = 1.58
        this.roughnessNode = float(0.17)
          .add(inside.oneMinus().mul(0.08))
          .add(facetVisibility.oneMinus().mul(0.2))
          .add(toolMarks.mul(0.025))
        this.retroreflectivityNode = inside.mul(acceptance.mul(0.7).add(0.28))
        this.normalNode = negateOnBackSide(normal)
        this.clearcoat = 0.85
        this.clearcoatRoughness = 0.055
        this.clearcoatNormalNode = normalViewGeometry
        this.aoNode = inside.mul(0.22).add(0.78)
        break
      }
            // ---------------------------------------------------------------
            // A continuous sheet of folded, vermilion-printed rag paper.
            // The silhouette really pleats. Different slopes carry different
            // pigments, so circling the piece alternately conceals and reveals
            // the red facets without an artificial view-dependent hue shift.
            // ---------------------------------------------------------------
      case 'folded_silence': {
        const tube = uv()
        const {U, V, pleat} = foldFields(tube)
        this.positionNode = foldedPosition(tube)
        const e = 0.0002
        const du = foldedPosition(tube.add(vec2(e, 0)))
          .sub(foldedPosition(tube.sub(vec2(e, 0))))
        const dv = foldedPosition(tube.add(vec2(0, e)))
          .sub(foldedPosition(tube.sub(vec2(0, e))))
        const foldedNormal = varying(transformNormalToView(du.cross(dv).normalize())).normalize()
        const {p, near} = viewerFrame(foldedNormal)
        const fibreQ = p.mul(vec3(160, 32, 160))
        const fibreVisibility = visibility(fibreQ.fwidth().length()).mul(near)
        const fibres = mx_noise_float(fibreQ)
          .add(mx_noise_float(p.mul(vec3(32, 240, 32)))
            .mul(0.3))
          .mul(fibreVisibility)
        const inkFacet = U.cos().smoothstep(0.15, 0.65)
          .mul(V.cos().smoothstep(-0.5, 0.6))
        const score = line(U.cos(), 0.015)
        const valley = pleat.mul(-0.5).add(0.5)
        const paper = color('#efe7d3')
          .mul(fibres.mul(0.025).add(0.97))
        const ink = color('#bd3024')
          .mul(fibres.mul(0.045).add(0.96))
        this.colorNode = mix(paper, ink, inkFacet)
          .mul(score.mul(-0.1).add(1))
        this.metalness = 0
        this.ior = 1.46
        this.specularIntensity = 0.22
        this.roughnessNode = float(0.88)
          .sub(inkFacet.mul(0.22))
          .add(fibres.mul(0.018))
          .clamp(0.55, 0.95)
        this.normalNode = negateOnBackSide(bumpNormal(fibres.mul(0.00008), foldedNormal))
        this.aoNode = valley.pow(3).mul(-0.28).add(1)
        break
      }
            // ---------------------------------------------------------------
            // Recessed mechanical watchwork beneath smooth sapphire-like lids.
            // Three depths produce genuine occlusion/parallax at the apertures:
            // a balance spring, a brass wheel, and a counter-rotating idler.
            // All illumination is ordinary PBR; the mechanism does not glow.
            // ---------------------------------------------------------------
      case 'horologists_paradox': {
        const tube = uv()
        const {p, near, uvSlope} = viewerFrame()
        const modules = vec2(24, 3)
        const q = tube.mul(modules)
        const moduleId = q.floor()
        const local = q.fract().sub(0.5)
        const random = cellNoiseVec3(vec3(wrapCell(moduleId, modules), 41.7))
        const ray = uvSlope.mul(modules)
        const surfaceRadius = local.length()
        const aperture = disk(surfaceRadius, 0.437)
        const bezel = annulus(surfaceRadius, 0.416, 0.472)
                // Keep each ray inside its original compartment. Wrapping
                // these coordinates would incorrectly expose a neighbouring
                // mechanism through the cavity's side wall.
        const backPoint = local.sub(ray.mul(0.032))
        const backVisible = disk(backPoint.length(), 0.421)
        const springPoint = backPoint.sub(vec2(0.025, -0.025))
        const springRadius = springPoint.length()
        const springAngle = mx_atan2(springPoint.y, springPoint.x.add(0.000001)) as unknown as Node<'float'>
        const balanceMotion = time.mul(1.15)
          .add(random.x.mul(TAU))
          .sin()
          .mul(0.16)
        const springPhase = springRadius.mul(TAU * 17)
          .sub(springAngle)
          .sub(balanceMotion)
        const spring = springPhase.cos()
          .smoothstep(0.75, 0.96)
          .mul(visibility(springPhase.fwidth(), 0.5, 3))
          .mul(annulus(springRadius, 0.065, 0.29))
          .mul(near.mul(0.65).add(0.35))
        const wall = color('#0a141d')
        const backplate = color('#263c42')
          .mul(mx_noise_float(p.mul(38))
            .mul(0.08)
            .add(0.9))
        let interior = mix(wall, mix(backplate, color('#e6d4a4'), spring.mul(0.85)), backVisible)
        const bigLayer = local.sub(ray.mul(0.017))
        const bigPoint = bigLayer.sub(vec2(-0.1, -0.045))
        const bigRotation = time.mul(0.13)
          .add(random.y.mul(TAU))
        const big = watchGear(bigPoint, 0.265, 18, bigRotation)
        const bigMask = big.mask.mul(disk(bigLayer.length(), 0.434))
        const smallLayer = local.sub(ray.mul(0.009))
        const smallPoint = smallLayer.sub(vec2(0.24, 0.145))
        const smallRotation = time.mul(-0.234)
          .add(random.y.mul(-TAU * 1.8))
        const small = watchGear(smallPoint, 0.145, 10, smallRotation)
        const smallMask = small.mask.mul(disk(smallLayer.length(), 0.434))
        const brassBrush = filteredWave(big.r.mul(360)).mul(near)
        const nickelBrush = filteredWave(small.r.mul(430)).mul(near)
        const brass = mix(color('#94602d'), color('#efc87b'), big.r.div(0.265).clamp().mul(0.6).add(0.25))
          .mul(big.engraving.mul(-0.23).add(1))
          .mul(brassBrush.mul(0.07).add(0.94))
        const nickel = color('#a5bec0')
          .mul(small.engraving.mul(-0.23).add(1))
          .mul(nickelBrush.mul(0.06).add(0.94))
        interior = mix(interior, brass, bigMask)
        interior = mix(interior, nickel, smallMask)
        const jewel = disk(big.r, 0.033)
          .mul(disk(bigLayer.length(), 0.434))
          .mul(smallMask.oneMinus())
        interior = mix(interior, color('#a91336'), jewel)
        const bridge = line(local.dot(vec2(0.8, -0.6)).sub(0.08), 0.026).mul(disk(surfaceRadius, 0.447))
        const screwA = local.sub(vec2(0.268, 0.224))
        const screwB = local.sub(vec2(-0.14, -0.32))
        const headA = disk(screwA.length(), 0.042)
        const headB = disk(screwB.length(), 0.042)
        const screwHeads = headA.max(headB)
        const slots = line(screwA.dot(vec2(0.7071, 0.7071)), 0.006).mul(headA).max(line(screwB.dot(vec2(0.7071, -0.7071)), 0.006).mul(headB))
        const plateBrush = filteredWave(tube.x.mul(TAU * 950)).mul(near)
        const plate = color('#687d87')
          .mul(plateBrush.mul(0.04).add(0.96))
        let surface = mix(plate, interior, aperture)
        surface = mix(surface, color('#c8be99'), bezel.mul(0.72))
        surface = mix(surface, color('#233742'), bridge)
        surface = mix(surface, color('#c7d1c6'), screwHeads)
        surface = mix(surface, color('#111b24'), slots)
        const occluder = bezel.max(bridge).max(screwHeads)
        const interiorVisibility = aperture.mul(occluder.oneMinus())
        const machinery = bigMask.max(smallMask)
          .mul(interiorVisibility)
        const visibleJewel = jewel.mul(interiorVisibility)
        const bigTangent = vec2(bigPoint.y.negate(), bigPoint.x)
          .div(big.r.max(0.001))
        const smallTangent = vec2(smallPoint.y.negate(), smallPoint.x).div(small.r.max(0.001))
        const machiningDirection = mix(bigTangent, smallTangent, smallMask)
        const relief = aperture.oneMinus().mul(0.0015)
          .add(bezel.mul(0.0024))
          .add(bridge.mul(0.003))
          .add(screwHeads.mul(0.0038))
          .add(bigMask.mul(interiorVisibility).mul(0.00075))
          .add(smallMask.mul(interiorVisibility).mul(0.0011))
          .add(visibleJewel.mul(0.0012))
          .sub(slots.mul(0.0006))
        this.envMapIntensity = 1.05
        this.colorNode = surface
        this.metalnessNode = visibleJewel.mul(-0.95)
          .add(1)
          .mul(0.85)
        this.roughnessNode = mix(mix(float(0.32), float(0.22), machinery), float(0.085), visibleJewel)
        this.anisotropy = 0.7
        this.anisotropyNode = mix(vec2(0.24, 0), machiningDirection.mul(0.7), machinery).mul(visibleJewel.oneMinus())
        this.normalNode = negateOnBackSide(bumpNormal(relief))
        this.ior = 1.48
        this.clearcoat = 0.8
        this.clearcoatNode = mix(float(0.18), float(0.8), aperture)
        this.clearcoatRoughnessNode = mix(float(0.18), float(0.045), aperture)
        this.clearcoatNormalNode = normalViewGeometry
        this.aoNode = mix(float(0.47), float(1), aperture.oneMinus()
          .max(bridge)
          .max(bigMask.mul(0.5)))
        break
      }
    }
  }
}
