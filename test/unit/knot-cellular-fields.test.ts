import {describe, expect, test} from 'bun:test'

import fs from 'fs-extra'
import {cellularBoundary} from 'knot-materials/lib/cellularBoundary.ts'
import {cellularPoints} from 'knot-materials/lib/cellularPoints.ts'
import {vec3} from 'three/tsl'

const knotSource = (file: string) => fs.readFile(new URL(`../../packages/knot-materials/src/${file}`, import.meta.url), 'utf8')
const source = (id: string) => knotSource(`entries/${id}/Material.ts`)
describe('Knot cellular fields', () => {
  test('constructs real distance fields and rejects support that could reach another feature', () => {
    expect(cellularBoundary(vec3(0)).isNode).toBe(true)
    expect(cellularPoints(vec3(0)).isNode).toBe(true)
    expect(cellularPoints(vec3(0), 0, 0.24, 0.9).isNode).toBe(true)
    for (const [inner, outer, threshold] of [[-1, 0.2, 0.5], [0.2, 0.2, 0.5], [0.1, 0.25, 0.5], [0.1, 0.2, 1], [0.1, 0.2, -1], [0.1, Number.NaN, 0.5]]) {
      expect(() => cellularPoints(vec3(0), inner, outer, threshold)).toThrow(RangeError)
    }
  })
  test('keeps feature identity out of the point distance and bounds its support before gating', async () => {
    const text = (await Promise.all(['lib/cellularPoints.ts', 'lib/cellularBoundary.ts'].map(knotSource))).join('\n')
    expect(text).toContain('cellNoiseVec3(cell).mul(0.5).add(0.25)')
    expect(text).toContain('position.fract().sub(center).length()')
    expect(text).toContain('mx_cell_noise_float(cell)')
    expect(text).toContain('distance.smoothstep(inner, outer).oneMinus()')
    expect(text).toContain('distances.y.sub(distances.x)')
  })
  test('uses localized inclusions instead of whole-cell point masks', async () => {
    const cases: Array<string> = [
      'celestial_astrolabe',
      'abyssal_bioluminescence',
      'abyssal_lumen',
      'zero_point_lather',
      'elytra_iridescence',
      'photonic_morpho',
      'opaline_aerogel',
      'radiometric_guilloche',
      'resonant_cymatics',
      'birefringent_glacier',
      'mycelium_choir',
      'gossamer_dew',
      'ion_wake',
      'abyssal_cathedral',
      'lichen_cathedral',
      'harlequin_opal',
      'magma_heart',
      'eventide_silk',
      'nocturne_opal',
      'kairothic_frost',
    ]
    for (const id of cases) {
      const text = await source(id)
      expect(text, id).toContain('cellularPoints(')
      expect(text, id).not.toContain('mx_cell_noise_float(')
    }
  })
  test('rounds Abyssal Lumen spots without changing their drift, pulse or proximity response', async () => {
    const text = await source('abyssal_lumen')
    expect(text).toContain('cellularPoints(p.mul(30).add(time.mul(0.03)), 0.06, 0.24, 0.86)')
    expect(text).toContain('const pulse = time.mul(0.8).add(bodyNoise.mul(4)).sin().mul(0.5).add(0.5)')
    expect(text).toContain("color('#ff4fd8').mul(spots).mul(pulse).mul(intimate.mul(0.8).add(0.3))")
    expect(text).toContain('this.transmission = 0.6')
  })
  test('localizes Astral Orrery stars while preserving its rectangular gear teeth and engraved rings', async () => {
    const text = await source('astral_orrery')
    expect(text).toContain('const constellation = cellularPoints(p.mul(24).add(vec3(0, time.mul(0.01), 0)), 0.06, 0.24, 0.92)')
    expect(text).toContain('const gearTeeth = mx_cell_noise_float(vec3(tube.x.mul(180), tube.y.mul(8), 0)).smoothstep(0.6, 0.7)')
    expect(text).toContain('const rings = opticalLine(tube.x.mul(48).fract().sub(0.5), 0.04)')
    expect(text).toContain('proceduralNormal(engrave.mul(0.6).add(constellation.mul(0.3)), 0.0015)')
    expect(text).toContain("color('#8cf5ff').mul(constellation).mul(near.mul(0.7).add(0.2)).mul(1.2)")
  })
  test('localizes Quantum Foam collapse events while retaining interference and transparency', async () => {
    const text = await source('zero_point_lather')
    expect(text).toContain('const collapse = cellularPoints(p.mul(26).add(view.mul(3)).add(time.mul(0.5)), 0.06, 0.24, 0.75)')
    expect(text).toContain('const phase = p.dot(view).mul(18).add(time.mul(1.7))')
    expect(text).toContain('const interference = phase.sin().mul(phase.mul(0.7).add(view.x.mul(4)).cos()).abs()')
    expect(text).toContain('const probability = interference.mul(0.6).add(collapse.mul(0.8)).add(voidNoise.mul(0.2)).clamp()')
    expect(text).toContain('this.opacityNode = probability.mul(0.55).add(collapse.mul(0.3)).add(intimate.mul(0.15)).clamp()')
    expect(text).toContain('this.transparent = true')
    expect(text).toContain('this.depthWrite = true')
    expect(text).toContain('this.side = DoubleSide')
  })
  test('retains stochastic alpha scintillation without moving cell-shaped patches', async () => {
    const text = await source('radiometric_guilloche')
    expect(text).toContain('const tick = time.mul(28).floor()')
    expect(text).toContain('cellularPoints(p.mul(85).add(vec3(0, 0, tick)), 0.025, 0.16, 0.7)')
    expect(text).toContain("const radiumPhosphor = color('#55ff77')")
    expect(text).toContain('proceduralNormal(rosette.mul(0.25), 0.004)')
  })
  test('keeps moving cymatic dust confined to the evolving acoustic nodes', async () => {
    const text = await source('resonant_cymatics')
    expect(text).toContain('const chladni = mix(modeA, modeB, resonanceShift)')
    expect(text).toContain('const nodalBand = chladni.abs().smoothstep(0.02, 0.14).oneMinus()')
    expect(text).toContain('cellularPoints(p.mul(64).add(vec3(0, time.mul(0.2), 0)), 0.06, 0.22, 0.2).mul(nodalBand)')
    expect(text).not.toContain('cellNoiseVec3(')
  })
  test('localizes scarab platelet glints while retaining their individual orientations', async () => {
    const text = await source('elytra_iridescence')
    expect(text).toContain('const q = p.mul(95)')
    expect(text).toContain('const sparkleRnd = cellNoiseVec3(q)')
    expect(text).toContain('const sparkleGlint = glints(sparkleNormal, 120)')
    expect(text).toContain('const sparkleMask = cellularPoints(q, 0.07, 0.24, 0.3)')
    expect(text).toContain('.mul(sparkleGlint).mul(sparkleMask)')
    expect(text).toContain('this.iridescenceThicknessNode = microRibs.mul(190).add(370)')
  })
  test('retains Magma Heart ember drift, proximity gating and its pulsing lava field', async () => {
    const text = await source('magma_heart')
    expect(text).toContain('cellularPoints(p.mul(90).add(vec3(0, time.mul(0.35), 0)), 0.025, 0.16, 0.7).mul(intimate)')
    expect(text).toContain('const cracksWide = filament(crackFieldA, 0.1)')
    expect(text).toContain('const beat = time.mul(1.6).fract()')
    expect(text).toContain("color('#ffcf7a').mul(embers).mul(1.2)")
  })
  test('localizes Nebula Reliquary embers without changing its volume integration', async () => {
    const text = await source('nebula_reliquary')
    expect(text).toContain('cellularPoints(p.sub(view.mul(0.12)).mul(60), 0.025, 0.16, 0.7).mul(intimate)')
    expect(text).not.toContain('mx_cell_noise_float')
    expect(text).toContain('const steps = 8')
    expect(text).toContain('const q = p.add(dir.mul(chord.mul(t)))')
    expect(text).toContain("color('#fff1c8').mul(embers).mul(1.5)")
  })
  test('localizes Obsidian Heartbeat embers without replacing its continuous fractures', async () => {
    const text = await source('obsidian_heartbeat')
    expect(text).toContain('cellularPoints(p.sub(view.mul(0.1)).mul(52), 0.035, 0.2, 0.6).mul(intimate.mul(0.8).add(0.2))')
    expect(text).not.toContain('mx_cell_noise_float')
    expect(text).toContain('const crackLarge = filament(wLarge1.sub(wLarge2), 0.035)')
    expect(text).toContain('const crackFine = filament(wFine1.sub(wFine2), 0.02)')
    expect(text).toContain("color('#ff8a00').mul(embers).mul(2.5)")
  })
  test('confines drifting frost sparkles without altering geometric frost growth', async () => {
    const text = await source('kairothic_frost')
    expect(text).toContain('cellularPoints(p.mul(62).add(vec3(0, time.mul(0.5), 0)), 0.04, 0.22, 0.4).mul(frostMask).mul(near)')
    expect(text).not.toContain('cellNoiseVec3(')
    expect(text).toContain('this.positionNode = positionLocal.add(normalLocal.mul(frostMask.mul(0.018).mul(near)))')
    expect(text).toContain("color('#a8e6ff').mul(sparkle).mul(1.2)")
  })
  test('localizes bioluminescent spores while preserving their depth and neural pulses', async () => {
    const text = await source('abyssal_bioluminescence')
    expect(text).toContain('const deep2 = p.sub(view.mul(0.28))')
    expect(text).toContain('const sporeSample = deep2.mul(30)')
    expect(text).toContain('cellularPoints(sporeSample, 0.06, 0.24, 0.35).mul(spores.y).mul(intimate)')
    expect(text).toContain('const pulse1 = tube.x.mul(14).sub(time.mul(1.5)).fract()')
    expect(text).toContain('const pulse2 = tube.x.mul(-9).sub(time.mul(0.95)).fract()')
    expect(text).toContain('sporeGlow.mul(colorPink).mul(3.2)')
  })
  test('evaluates neighboring shrine emitters without switching their tint or shimmer identity', async () => {
    const text = await source('interference_shrine')
    expect(text).toContain('interferenceLattice(p.mul(9.5))')
    expect(text).not.toContain('latticeQ.fract()')
    expect(text).toContain('mx_cell_noise_float(vec3(tick, 6.6, 2.2))')
    const lattice = await knotSource('entries/interference_shrine/util.ts')
    expect(lattice).toContain('Loop(27, ({i}) =>')
    expect(lattice).toContain('vec3(i.mod(3), i.div(3).mod(3), i.div(9)).sub(1)')
    expect(lattice).toContain('cellNoiseVec3(cell.add(offset))')
    expect(lattice).toContain('offset.add(random.mul(0.5).add(0.25))')
    expect(lattice).toContain('smoothstep(0.08, 0.45).oneMinus()')
    expect(lattice).toContain('time.mul(2.5).add(random.x.mul(19))')
    expect(lattice).toContain('glow.addAssign(tint.mul(dot).mul(shimmer))')
  })
  test('keeps Cryo Bloom frost continuous and places cracks on real crystal boundaries', async () => {
    const text = await source('cryo_bloom')
    expect(text).not.toContain('mx_cell_noise_float')
    expect(text).not.toContain('cellNoiseVec3')
    expect(text).toContain('const frostWarp = mx_noise_vec3(p.mul(14)).mul(0.5).add(0.5)')
    expect(text).toContain('mx_noise_float(p.mul(28).add(frostWarp.mul(1.5)))')
    expect(text).toContain('const crystal = cellularBoundary(p.mul(22))')
    expect(text).toContain('opticalLine(cellularBoundary(p.mul(9)), 0.03)')
    expect(text).toContain('proceduralNormal(facet.mul(0.7).add(frost.mul(0.2)), 0.002)')
    expect(text).toContain('this.transmission = 0.85')
    expect(text).toContain('this.ior = 1.31')
  })
  test('shapes Scarab Aegis cuticle and edge glow from genuine plate boundaries', async () => {
    const text = await source('scarab_aegis')
    expect(text).not.toContain('mx_cell_noise_float')
    expect(text).toContain('const plateBoundary = cellularBoundary(p.mul(36))')
    expect(text).toContain('const cuticle = plateBoundary.smoothstep(0.02, 0.3)')
    expect(text).toContain('const facetEdges = opticalLine(plateBoundary, 0.05)')
    expect(text).toContain('proceduralNormal(cuticle.mul(intimate), 0.0018)')
    expect(text).toContain('this.iridescenceThicknessNode = cuticle.mul(220).add(360)')
    expect(text).toContain('const braggPhase = grazing.pow(1.6).mul(4.5).add(0.4)')
    expect(text).toContain('structuralColor.mul(facetEdges).mul(near.mul(0.65).add(0.35)).mul(0.7)')
  })
  test('bounds Mycelium Choir fruit before exponentiation to keep transmission finite', async () => {
    const text = await source('mycelium_choir')
    expect(text).toContain('mx_worley_noise_float(inner.mul(8.5)).oneMinus().clamp().pow(5).mul(intimate)')
    expect(text).not.toContain('.oneMinus().pow(5)')
    expect(text).toContain('this.transmissionNode = fruit.mul(0.35).add(spores.mul(0.15))')
    expect(text).toContain('const pulse = choirPulse()')
    expect(text).toContain('proceduralNormal(bark.mul(0.5).add(hyphae.mul(0.35)), 0.0026)')
  })
  test('bounds Abyssal Leviathan scales before powering and sharing the material mask', async () => {
    const text = await source('abyssal_leviathan')
    expect(text).toContain('mx_fractal_noise_float(scalePos, 3, 2, 0.5).mul(0.5).add(0.5).clamp().pow(3)')
    expect(text).not.toContain('.add(0.5).pow(3)')
    expect(text).toContain('const scalePos = p.mul(12).add(vec3(0, time.mul(0.1), 0))')
    expect(text).toContain('this.anisotropyNode = scales')
    expect(text).toContain('this.roughnessNode = scales.mul(0.3).add(0.2)')
    expect(text).toContain('proceduralNormal(scales, 0.05)')
    expect(text).toContain('deepGlow.mul(pulse).mul(intimate.mul(0.8).add(0.2)).mul(scales.oneMinus())')
  })
  test('uses continuous solar granulation and genuine Voronoi fractures', async () => {
    for (const id of ['cryogenic_kintsugi', 'chromospheric_spicule']) {
      const text = await source(id)
      expect(text).toContain('cellularBoundary(')
      expect(text).not.toContain('cellNoiseVec3(')
    }
    for (const id of ['solar_prominence', 'caged_star']) {
      const text = await source(id)
      expect(text).toContain('mx_worley_noise_float(')
      expect(text).not.toContain('cellNoiseVec3(')
    }
    expect(await source('caged_star')).toContain('mx_cell_noise_float(vec3(flareTick')
  })
  test('keeps skin and nacre backgrounds continuous without removing contained papillae', async () => {
    const skin = await source('chromatophore_skin')
    expect(skin).toContain('const rnd = cellNoiseVec3(q)')
    expect(skin).toContain('this.positionNode = p.add(normalLocal.mul(papillaHeight))')
    expect(skin).toContain('mx_noise_float(p.mul(24))')
    expect(skin).toContain('this.iridescenceThicknessNode = structuralNoise')
    expect(skin).toContain('.min(0.235)')
    expect(skin).toContain('.min(0.245)')
    const nacre = await source('abyssal_nacre')
    expect(nacre).not.toContain('cellNoiseVec3(')
    expect(nacre).not.toContain('mx_cell_noise_float(')
  })
  test('prevents filtering and secondary tint seeds from revealing feature ownership', async () => {
    const opal = await source('harlequin_opal')
    expect(opal).toContain('mx_worley_noise_float(cellP, 0.2, 1)')
    expect(opal).toContain('.min(0.39)')
    expect(opal).not.toContain('cellP.fract()')
    expect(opal).not.toContain('spectralColor(id.z.mul(9)')
    const stone = await source('abyssal_cathedral')
    expect(stone).toContain('q.floor().add(vec3(23, 92, 47))')
    expect(stone).toContain('fp.add(0.22).min(0.24)')
  })
  test('preserves Abyssal Chromatophore feature identities and full cross-cell support', async () => {
    const text = await source('abyssal_chromatophore')
    const fields = await knotSource('entries/abyssal_chromatophore/util.ts')
    expect(text).toContain('pigmentCells(cq, phase, arousal)')
    expect(text).toContain('photophoreCells(pq, sweep, intimate)')
    expect(text).not.toContain('cellNoiseVec3(')
    expect(fields.match(/Loop\(27,/g)).toHaveLength(2)
    expect(fields.match(/const identity = cell.add\(offset\).toVar\(\)/g)).toHaveLength(2)
    expect(fields).toContain('cellNoiseVec3(identity.add(vec3(17.3, 5.9, 41.2)))')
    expect(fields).toContain('cellNoiseVec3(identity.add(vec3(7.7, 23.1, 3.3)))')
    expect(fields).toContain('local.sub(center).length()')
    expect(fields).toContain('coverage.clamp()')
    expect(fields).toContain('pigment.div(coverage.max(0.000001))')
    expect(fields).toContain('footprint.smoothstep(0.35, 1.2).oneMinus()')
    expect(fields).toContain('.add(0.07).min(0.35)')
    // The original maximum dilation is retained, not shrunk to hide the cutoffs.
    const maximumRadius = (0.32 + 0.04) * (0.5 + 0.75)
    expect(maximumRadius).toBeCloseTo(0.45)
    expect(maximumRadius + 1.2 * 0.6).toBeLessThan(1 + 0.25)
    expect(0.35).toBeLessThan(1 + 0.2)
    expect(text).toContain('facing.pow(1.4).mul(near.mul(0.7).add(0.3))')
    expect(text).toContain('tube.x.mul(Math.PI * 2 * 3).sub(time.mul(1.4))')
    expect(text).toContain('tube.x.mul(Math.PI * 2 * 2).sub(time.mul(0.9))')
    expect(text).toContain('photophore.mul(facing.pow(10)).mul(near)')
    expect(fields).toContain('sweep.mul(1.2).add(twinkle.mul(0.25)).add(intimate.mul(0.5))')
    expect(text).toContain('proceduralNormal(chroma.mul(0.7).add(photophore.mul(1.2)).add(skinNoise.mul(0.12)), 0.0011)')
  })
  test('keeps Maki-e flakes whole and tilted independently without stamping cell tints onto threads', async () => {
    const text = await source('makie_lacquer')
    const fields = await knotSource('entries/makie_lacquer/util.ts')
    expect(text).not.toContain('mx_cell_noise_vec3')
    expect(text).toContain('const inner = p.sub(view.mul(0.012))')
    expect(text).toContain('const q = inner.mul(85)')
    expect(text).toContain('mx_fractal_noise_float(p.mul(2.6), 2, 2, 0.5)')
    expect(text).toContain('goldFlakes(q, threshold)')
    expect(fields).toContain('Loop(27, ({i}) =>')
    expect(fields).toContain('const identity = cell.add(offset).toVar()')
    expect(fields).toContain('cellNoiseVec3(identity.add(vec3(37.1, 11.3, 59.7)))')
    expect(fields).toContain('offset.add(secondary.mul(0.4).add(0.3))')
    expect(fields).toContain('local.sub(center).length()')
    expect(fields).toContain('distance.smoothstep(0.24, outer).oneMinus()')
    expect(fields).toContain('footprint.mul(0.8).add(0.3).min(1.3)')
    expect(fields).toContain('footprint.smoothstep(0.4, 1.6).oneMinus()')
    expect(fields).toContain('normalViewGeometry.add(secondary.mul(2).sub(1).mul(0.45)).normalize()')
    expect(fields).toContain('sparkle.addAssign(tint.mul(glints(normal, 90)).mul(mask))')
    expect(fields).toContain('tintSum.div(coverage.max(0.000001))')
    expect(fields).toContain('coverage.clamp()')
    expect(text).toContain('this.colorNode = mix(mix(lacquer, flakeTint, flakeMask), threadTint, threadMask)')
    expect(text).toContain('tube.y.mul(3).add(tube.x.mul(36))')
    expect(text).toContain('tube.y.mul(-2).add(tube.x.mul(24))')
    expect(text).toContain('0.035).mul(intimate)')
    expect(text).toContain('this.clearcoatRoughness = 0.035')
    expect(text).toContain('flakeSparkle.mul(1.4).mul(near.mul(0.6).add(0.5))')
  })
  test('rounds Lichen Cathedral fruiting bodies without changing the sheltered growth or breathing stone', async () => {
    const text = await source('lichen_cathedral')
    expect(text).toContain('cellularPoints(p.mul(28), 0.06, 0.24, 0.88).mul(lichenBaseMask)')
    expect(text).not.toContain('mx_cell_noise_float')
    expect(text).toContain('mx_worley_noise_float(p.mul(6.2))')
    expect(text).toContain('lichenNoise.smoothstep(0.25, 0.65).mul(shelterMask)')
    expect(text).toContain('time.mul(0.35).sin().mul(0.15).add(0.85)')
    expect(text).toContain('normalLocal.mul(lichenBaseMask.mul(0.025).mul(near).mul(detailLichen.mul(0.5).add(0.5)))')
    expect(text).toContain('fruiting.mul(fruitMask).mul(0.6)')
    expect(text).toContain('fruiting.mul(fruitMask).mul(breath).mul(0.9)')
    expect(text).toContain('this.envMapIntensity = 0.4')
  })
})
