import type {Node, Texture} from 'three/webgpu'

import * as tsl from 'three/tsl'
import {cameraPosition, color, float, mix, modelWorldMatrixInverse, mx_cell_noise_float, mx_fractal_noise_float, mx_noise_float, mx_noise_vec3, mx_worley_noise_float, mx_worley_noise_vec3, negateOnBackSide, normalLocal, normalViewGeometry, positionGeometry, positionView, positionViewDirection, reflect, time, uv, vec3, vec4} from 'three/tsl'
import {MeshPhysicalNodeMaterial} from 'three/webgpu'

import {cellularPoints} from '../cellularField.ts'

// --- Utility Functions & Shading Helpers ---

export function spectralColor(phase: Node<'float'>) {
  return vec3(phase, phase.add(2.0944), phase.add(4.1888)).cos().mul(0.46).add(0.54)
}

export function opticalLine(field: Node<'float'>, width: number) {
  const footprint = field.fwidth().max(0.0001)
  return field.abs().smoothstep(width, footprint.mul(1.25).add(width)).oneMinus().mul(footprint.smoothstep(width * 3, width * 12).oneMinus())
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

export function glints(normal: Node<'vec3'>, sharpness: number) {
  const lamps = [vec3(0.35, 0.78, 0.52), vec3(-0.62, 0.28, 0.73), vec3(0.1, -0.35, 0.93)]
  let sum: Node<'float'> = float(0)
  for (const lamp of lamps) {
    const half = lamp.normalize().add(positionViewDirection).normalize()
    sum = sum.add(normal.dot(half).clamp().pow(sharpness))
  }
  return sum
}

export function cosinePalette(t: Node<'float'>, bias: Triple, amplitude: Triple, frequency: Triple, phase: Triple) {
  return vec3(...bias).add(vec3(...amplitude).mul(vec3(...frequency).mul(t).add(vec3(...phase)).mul(Math.PI * 2).cos()))
}

// --- Premium Finish Definitions ---

export const knotFinishes = [
  {
    id: 'celestial_astrolabe',
    title: 'Celestial Astrolabe',
    accent: '#f3c14b',
  },
  {
    id: 'abyssal_bioluminescence',
    title: 'Abyssal Bioluminescence',
    accent: '#00ffd0',
  },
  {
    id: 'elytra_iridescence',
    title: 'Elytra Iridescence',
    accent: '#27e8a7',
  },
  {
    id: 'magma_chrysalis',
    title: 'Magma Chrysalis',
    accent: '#ff4d17',
  },
  {
    id: 'birefringent_crystal',
    title: 'Birefringent Crystal',
    accent: '#8ee3ff',
  },
  {
    id: 'quantum_damascus',
    title: 'Quantum Damascus',
    accent: '#5c7cfa',
  },
  {
    id: 'velvet_mycelium',
    title: 'Velvet Mycelium',
    accent: '#d946ef',
  },
  {
    id: 'tesseract_matrix',
    title: 'Tesseract Matrix',
    accent: '#00f5ff',
  },
] as const

export type KnotFinish = typeof knotFinishes[number]['id']

export class KnotMaterialPremium extends MeshPhysicalNodeMaterial {
  constructor(finish: KnotFinish, environment: Texture) {
    super({
      envMap: environment,
      envMapIntensity: 1,
    })
    this.name = finish
    switch (finish) {
            /**
             * 1. CELESTIAL ASTROLABE
             * Master-crafted Renaissance astronomical clockwork forged of gilded ormolu brass.
             * Crevices harbor turquoise verdigris patina. Anisotropic radial brushing glides with the view.
             * Close proximity unlocks microscopic graduation ticks, astrolabe reticles, and internal stellar fire.
             */
      case 'celestial_astrolabe': {
        const {p, facing, grazing, rim, near, intimate} = viewerFrame()
        const tube = uv()
                // Astrolabe graduations and celestial coordinate engravings
        const degreeRings = opticalLine(tube.x.mul(144).fract().sub(0.5), 0.05)
        const degreeFine = opticalLine(tube.x.mul(576).fract().sub(0.5), 0.04).mul(intimate)
        const meridianLines = opticalLine(tube.y.mul(24).fract().sub(0.5), 0.05)
        const reticle = opticalLine(tube.y.mul(4).add(tube.x.mul(48)).fract().sub(0.5), 0.04)
                // Verdigris oxidation in low recesses
        const patinaFractal = mx_fractal_noise_float(p.mul(4.8), 3, 2, 0.5)
        const patinaMask = patinaFractal.mul(0.65).add(grazing.mul(0.25)).smoothstep(0.35, 0.85)
        const patinaColor = mix(color('#154238'), color('#2ec49c'), mx_noise_float(p.mul(11)).mul(0.5).add(0.5))
                // Gilded Ormolu Brass base with viewing angle warmth
        const brass = mix(color('#8b5f1f'), color('#ffe17d'), facing.mul(0.4).add(0.6))
        const baseColor = mix(brass, patinaColor, patinaMask.mul(0.85))
                // Star cluster coordinates embedded within the dials
        const stars = cellularPoints(p.mul(38), 0.035, 0.2)
        const constellationWeb = opticalLine(mx_noise_float(p.mul(14)).mul(7).sin(), 0.045)
        this.colorNode = baseColor
        this.metalnessNode = patinaMask.oneMinus().mul(0.92)
        this.roughnessNode = mix(float(0.18), float(0.56), patinaMask)
        this.anisotropy = 0.85
        this.anisotropyNode = float(0.85)
        this.clearcoat = 0.45
        this.clearcoatRoughness = 0.08
        const engravedNormal = degreeRings.add(degreeFine).add(meridianLines).add(reticle).mul(0.35).sub(patinaMask.mul(0.25))
        this.normalNode = proceduralNormal(engravedNormal, 0.0018)
        const celestialGlow = color('#ffe699').mul(stars.mul(2.2).add(constellationWeb.mul(0.6)))
        const starlight = spectralColor(p.y.mul(6).add(time.mul(0.3))).mul(degreeFine).mul(0.8)
        this.emissiveNode = celestialGlow.add(starlight).mul(near.mul(0.7).add(0.4)).add(color('#10e7b2').mul(patinaMask).mul(rim).mul(0.15))
        break
      }
            /**
             * 2. ABYSSAL BIOLUMINESCENCE
             * Cryo-glacial hadal glass holding living siphonophore colonies.
             * Dual travelling neuro-electrical action-potential spikes surge across the knot loops in real-time,
             * refracting through deep oceanic indigo-blue dispersion and multi-depth organ clusters.
             */
      case 'abyssal_bioluminescence': {
        const {p, view, rim, near, intimate} = viewerFrame()
        const tube = uv()
        this.transmission = 0.94
        this.thickness = 0.72
        this.ior = 1.34
        this.dispersion = 0.42
        this.attenuationColor.set('#011627')
        this.attenuationDistance = 0.35
        this.roughness = 0.02
        this.clearcoat = 1
        this.clearcoatRoughness = 0.02
                // Interior parallax depth coordinates
        const deep1 = p.sub(view.mul(0.14))
        const deep2 = p.sub(view.mul(0.28))
                // Travelling action-potential neural waves
        const pulse1 = tube.x.mul(14).sub(time.mul(1.5)).fract()
        const nerveSpike1 = pulse1.smoothstep(0, 0.06).mul(pulse1.smoothstep(0.06, 0.28).oneMinus()).pow(1.5)
        const pulse2 = tube.x.mul(-9).sub(time.mul(0.95)).fract()
        const nerveSpike2 = pulse2.smoothstep(0, 0.07).mul(pulse2.smoothstep(0.07, 0.32).oneMinus()).pow(1.5)
                // Internal bioluminescent organ filaments & glowing colonial spores
        const organNoise = mx_noise_float(deep1.mul(15))
        const filaments = opticalLine(organNoise.mul(16).sin(), 0.045)
        const sporeSample = deep2.mul(30)
        const spores = cellNoiseVec3(sporeSample)
        // Per-spore brightness only contributes inside a compact, round inclusion.
        const sporeGlow = cellularPoints(sporeSample, 0.06, 0.24, 0.35).mul(spores.y).mul(intimate)
        const colorCyan = color('#00ffd0')
        const colorPink = color('#ff007f')
        const colorIndigo = color('#7928ca')
        const waveTint = mix(colorCyan, colorPink, nerveSpike1.add(nerveSpike2.mul(0.5)).clamp())
        this.colorNode = color('#010a12')
        this.normalNode = proceduralNormal(mx_noise_float(p.mul(22)).mul(0.12), 0.0012)
        const organGlow = filaments.mul(colorCyan).mul(1.6).add(sporeGlow.mul(colorPink).mul(3.2))
        const waveGlow = waveTint.mul(nerveSpike1.mul(3.8).add(nerveSpike2.mul(2.4)))
        this.emissiveNode = organGlow.add(waveGlow).mul(near.mul(0.7).add(0.5)).add(colorIndigo.mul(rim).mul(0.25))
        break
      }
            /**
             * 3. ELYTRA IRIDESCENCE
             * Biomimetic jewel scarab carapace (*Chrysina limbata*).
             * Ultra-vivid constructive thin-film interference shifting through emerald, sapphire, royal amethyst, and bronze.
             * Longitudinally brushed diffraction grating normals and embedded crystalline platelets that sparkle fiercely.
             */
      case 'elytra_iridescence': {
        const {p, grazing, near} = viewerFrame()
        const tube = uv()
        this.iridescence = 1
        this.iridescenceIOR = 1.76
                // Structural micro-rib thickness oscillation (interferes at 370nm - 560nm)
        const microRibs = tube.y.mul(160).add(tube.x.mul(16)).sin().mul(0.5).add(0.5)
        this.iridescenceThicknessNode = microRibs.mul(190).add(370)
                // Carapace body: deep viridian jade transitioning to midnight pitch
        this.colorNode = mix(color('#003623'), color('#01120b'), grazing.pow(1.3))
        this.metalnessNode = float(0.86)
        this.roughnessNode = float(0.12)
        this.clearcoat = 1
        this.clearcoatRoughness = 0.02
                // Velveteen micro-fiber sheen backscatter
        this.sheen = 0.95
        this.sheenNode = mix(color('#ffd166'), color('#e040fb'), grazing.pow(1.5))
        this.sheenRoughness = 0.22
                // Sub-micron longitudinal diffraction grooves
        const groove = tube.x.mul(640).sin().mul(0.002)
        this.normalNode = proceduralNormal(groove.add(mx_noise_float(p.mul(8)).mul(0.015)), 0.001)
                // Embedded crystalline micro-sparkle platelets
        const q = p.mul(95)
        const sparkleRnd = cellNoiseVec3(q)
        const sparkleNormal = normalViewGeometry.add(sparkleRnd.mul(2).sub(1).mul(0.35)).normalize()
        const sparkleGlint = glints(sparkleNormal, 120)
        // Per-platelet normals only contribute inside compact inclusions, never across a whole cell.
        const sparkleMask = cellularPoints(q, 0.07, 0.24, 0.3)
        this.emissiveNode = mix(color('#00ffaa'), color('#ff00aa'), grazing.pow(2)).mul(sparkleGlint).mul(sparkleMask).mul(2.5).mul(near.mul(0.6).add(0.5))
        break
      }
            /**
             * 4. MAGMA CHRYSALIS
             * Tectonic planetary knot where cooling vesicular basalt crust plates split apart.
             * The basalt plates undergo geometric vertex displacement, sinking down into fiery rift canyons
             * where turbulent incandescent convection magma pulses from 1800K to 6000K white-heat.
             */
      case 'magma_chrysalis': {
        const {p, near} = viewerFrame()
                // Irregular Voronoi tectonic plates: F2 - F1 approaches zero at cell boundaries.
                // A low-frequency vector warp breaks the remaining cellular regularity without moving the cracks over time.
        const fractureWarp = mx_noise_vec3(p.mul(2.3).add(vec3(17.3, 3.1, 8.7))).mul(0.72)
        const fractureDistances = mx_worley_noise_vec3(p.mul(7.4).add(fractureWarp), 1, 0)
        const fractureBoundary = fractureDistances.y.sub(fractureDistances.x)
        const fissure = fractureBoundary.smoothstep(0.035, 0.16).oneMinus()
        const fissureCore = fractureBoundary.smoothstep(0.012, 0.055).oneMinus()
                // True vertex silhouette displacement: basalt plates lift up while magma chasms sink
        const crustLift = fissure.oneMinus().mul(0.018)
        this.positionNode = positionGeometry.add(normalLocal.mul(crustLift))
                // Multi-octave convective magma flow
        const flow = p.mul(11).add(vec3(time.mul(0.35), time.mul(-0.25), time.mul(0.18)))
        const turbulence = mx_noise_float(flow).mul(0.5).add(mx_noise_float(flow.mul(2.6)).mul(0.25))
        const heat = fissureCore.mul(1.5).add(fissure.mul(0.55)).add(turbulence.mul(0.4)).clamp()
                // Blackbody radiation spectrum (cooling crimson -> bright amber -> thermonuclear white)
        const magmaColor = mix(mix(color('#1a0200'), color('#d12300'), heat.smoothstep(0.08, 0.45)), mix(color('#ff9500'), color('#ffffff'), heat.smoothstep(0.65, 1.15)), heat.smoothstep(0.45, 0.85))
        this.colorNode = mix(color('#080706'), color('#140d09'), mx_noise_float(p.mul(22)).mul(0.5).add(0.5))
        this.metalness = 0.08
        this.roughnessNode = mix(float(0.92), float(0.18), fissure)
        this.normalNode = proceduralNormal(fissure.mul(1.8).add(mx_noise_float(p.mul(28)).mul(0.2)), 0.0035)
                // Cooling cinder embers: the nearest Worley feature supplies both a compact round core and a per-site random gate.
        const emberSample = p.mul(45)
        const emberDistance = mx_worley_noise_float(emberSample, 1, 0)
        const emberGate = mx_worley_noise_float(emberSample, 1, 1).smoothstep(0.965, 0.99)
        const emberCore = emberDistance.smoothstep(0.025, 0.12).oneMinus().mul(emberGate)
        const embers = emberCore.mul(color('#ff4500')).mul(2.5)
        const magmaRadiance = magmaColor.mul(fissure).mul(heat.mul(4.5).add(1.2))
        this.emissiveNode = magmaRadiance.add(embers).mul(near.mul(0.6).add(0.5))
        break
      }
            /**
             * 5. BIREFRINGENT CRYSTAL
             * Optical Iceland spar calcite monolith with intense extraordinary double refraction.
             * Chromatic dispersion splits incoming environment light, while rhombohedral cleavage planes
             * exhibit internal Newton thin-film rainbow interference fringes in microscopic fractures.
             */
      case 'birefringent_crystal': {
        const {p, view, rim, near} = viewerFrame()
        this.transmission = 0.97
        this.thickness = 0.68
        this.ior = 1.658
        this.dispersion = 0.84
        this.attenuationColor.set('#e2f4ff')
        this.attenuationDistance = 0.75
        this.roughness = 0.015
        this.clearcoat = 1
        this.clearcoatRoughness = 0.015
                // Calcite rhombohedral cleavage planes
        const plane1 = p.dot(vec3(0.577, 0.577, 0.577)).mul(24)
        const plane2 = p.dot(vec3(-0.577, 0.577, 0.577)).mul(20)
        const cleavage1 = opticalLine(plane1.fract().sub(0.5), 0.035)
        const cleavage2 = opticalLine(plane2.fract().sub(0.5), 0.035)
                // Newton rings interference fringes within the micro-cleavage gaps
        const fringePhase = plane1.mul(3.2).add(view.x.mul(4.5)).add(view.y.mul(4.5))
        const newtonRainbow = spectralColor(fringePhase)
                // Directional Bragg diffraction flash
        const reflectionDir = reflect(view.negate(), normalViewGeometry)
        const prismAxis = vec3(0.707, 0.707, 0)
        const alignment = reflectionDir.dot(prismAxis).abs().pow(9)
        const spectralFlash = spectralColor(alignment.mul(12).add(time.mul(0.12))).mul(alignment)
        this.colorNode = color('#f7fbff')
        this.normalNode = proceduralNormal(cleavage1.add(cleavage2).mul(0.04), 0.0006)
        const cleavageGlow = newtonRainbow.mul(cleavage1.add(cleavage2)).mul(1.7)
        this.emissiveNode = cleavageGlow.add(spectralFlash.mul(1.8)).mul(near.mul(0.6).add(0.4)).add(color('#99e6ff').mul(rim).mul(0.12))
        break
      }
            /**
             * 6. QUANTUM DAMASCUS
             * Legendary folded Wootz steel etched with acid to reveal organic damascus grain.
             * Integrated with room-temperature superconducting Meissner ribbons that channel
             * relativistic Cherenkov cyan and quantum violet magnetic flux pulses along seamless tangents.
             */
      case 'quantum_damascus': {
        const {p, rim, near, intimate} = viewerFrame()
        const tube = uv()
                // Acid-etched folded rose & ladder pattern
        const foldWarp = mx_noise_float(p.mul(4.5)).mul(2.4)
        const grain = p.x.mul(16).add(p.y.mul(10)).add(foldWarp)
        const damascusBands = grain.mul(Math.PI * 3).sin().mul(0.5).add(0.5).pow(1.8)
                // Meissner superconducting flux channels
        const flux1 = opticalLine(tube.y.mul(6).add(tube.x.mul(24)).fract().sub(0.5), 0.04)
        const flux2 = opticalLine(tube.y.mul(-4).add(tube.x.mul(48)).fract().sub(0.5), 0.035).mul(intimate)
        const fluxMask = flux1.max(flux2)
                // Relativistic quantum flux packets surging down the channels
        const packet = tube.x.mul(36).sub(time.mul(3.5)).sin().mul(0.5).add(0.5).pow(6)
        const fluxColor = mix(color('#00f0ff'), color('#8a2be2'), packet)
        const darkSteel = color('#0f1114')
        const brightSteel = color('#dce4ed')
        const baseSteel = mix(darkSteel, brightSteel, damascusBands)
        this.colorNode = baseSteel
        this.metalnessNode = mix(float(0.92), float(0.98), damascusBands)
        this.roughnessNode = mix(float(0.34), float(0.08), damascusBands).mix(float(0.02), fluxMask)
        this.anisotropy = 0.9
        this.anisotropyNode = float(0.9)
        this.clearcoat = 0.55
        this.clearcoatRoughness = 0.05
        this.normalNode = proceduralNormal(damascusBands.mul(0.32).add(fluxMask.mul(0.4)), 0.0016)
        const fluxRadiance = fluxColor.mul(fluxMask).mul(packet.mul(3.2).add(1.3))
        this.emissiveNode = fluxRadiance.mul(near.mul(0.6).add(0.5)).add(color('#0077ff').mul(damascusBands).mul(rim).mul(0.08))
        break
      }
            /**
             * 7. VELVET MYCELIUM
             * Fruiting alien body weaving silken mulberry fungal velvet with a bio-digital mycorrhizal network.
             * Grazing angles bloom in peach-velvet retroreflective sheen. Approaching triggers nervous action spikes
             * that illuminate branching mycelial hyphae and nestled golden bioluminescent spore synapses.
             */
      case 'velvet_mycelium': {
        const {p, facing, grazing, near, intimate} = viewerFrame()
        const tube = uv()
        this.colorNode = mix(color('#150319'), color('#2b0733'), grazing.mul(0.6))
        this.metalness = 0
        this.roughness = 0.68
                // Velvet micro-fiber sheen backscattering
        this.sheen = 1
        this.sheenNode = mix(color('#ff66aa'), color('#ffd166'), grazing.pow(1.4))
        this.sheenRoughness = 0.3
                // Branching mycorrhizal hyphae network
        const hyphaeNoise = mx_noise_float(p.mul(14)).mul(4.5).add(tube.x.mul(18)).add(tube.y.mul(6))
        const threads = opticalLine(hyphaeNoise.sin(), 0.055)
        const threadsFine = opticalLine(mx_noise_float(p.mul(30)).mul(5).add(tube.x.mul(48)).sin(), 0.04).mul(intimate)
        const hyphaeMask = threads.max(threadsFine)
                // Bio-electric synaptic pulses
        const nervePulse = time.mul(2.2).add(p.x.mul(6)).add(p.y.mul(8)).sin().mul(0.5).add(0.5).pow(3)
                // Glowing spore clusters nestled in the velvet valleys
        const sporeGrid = p.mul(44)
        const sporeRnd = cellNoiseVec3(sporeGrid)
        const sporePresent = sporeRnd.x.smoothstep(0.86, 0.91)
        const sporeDist = sporeGrid.fract().sub(0.5).length()
        const sporeDots = sporeDist.smoothstep(0.28, 0.05).mul(sporePresent).mul(intimate)
        const hyphaeGlow = color('#00ffcc').mul(hyphaeMask).mul(nervePulse.mul(2.2).add(0.8))
        const sporeGlow = color('#ffea79').mul(sporeDots).mul(3.5)
        const subsurface = color('#7b2cbf').mul(facing.oneMinus().pow(2)).mul(0.35)
        this.normalNode = proceduralNormal(hyphaeMask.mul(0.25).add(sporeDots.mul(0.3)), 0.0014)
        this.emissiveNode = hyphaeGlow.add(sporeGlow).add(subsurface).mul(near.mul(0.7).add(0.4))
        break
      }
            /**
             * 8. TESSERACT MATRIX
             * 4D non-Euclidean manifold disguised as an obsidian mirror knot.
             * High grazing angles form a sleek liquid chromium reflection, but looking inward unveils
             * an infinite abyss populated by 4 recursive hypercube neon lattice planes rotating in 4D space.
             */
      case 'tesseract_matrix': {
        const {p, view, facing, grazing, rim, near} = viewerFrame()
        this.colorNode = color('#020406')
        this.metalnessNode = grazing.pow(1.4).mul(0.95)
        this.roughnessNode = grazing.oneMinus().mul(0.04).add(0.01)
        this.clearcoat = 1
        this.clearcoatRoughness = 0.02
                // 4 Recursive Interior Depth Layers (Pseudo-volumetric ray-projected lattice)
        const depths = [0.12, 0.25, 0.42, 0.65]
        const colors = [color('#00f5ff'), color('#ff007f'), color('#ffb703'), color('#9d4edd')]
        let innerGrid: Node<'vec3'> = vec3(0)
        for (const [i, d] of depths.entries()) {
          const col = colors[i]
          const posInner = p.sub(view.mul(d))
          const angle = time.mul(0.14 * (i + 1))
          const cosA = angle.cos()
          const sinA = angle.sin()
          const rotX = posInner.x.mul(cosA).sub(posInner.z.mul(sinA))
          const rotZ = posInner.x.mul(sinA).add(posInner.z.mul(cosA))
          const q = vec3(rotX, posInner.y.add(time.mul(0.035 * (i % 2 === 0 ? 1 : -1))), rotZ).mul(13 + i * 5)
          const gx = opticalLine(q.x.fract().sub(0.5), 0.05)
          const gy = opticalLine(q.y.fract().sub(0.5), 0.05)
          const gz = opticalLine(q.z.fract().sub(0.5), 0.05)
          const grid = gx.max(gy).max(gz)
          const attenuation = 1 / (1 + i * 0.65)
          innerGrid = innerGrid.add(col.mul(grid).mul(attenuation))
        }
                // Cyber telemetry scanlines flickering across grazing views
        const tick = time.mul(8).floor()
        const telemetry = mx_cell_noise_float(vec3(p.y.mul(26), tick, 1.5)).smoothstep(0.91, 0.96)
        const innerVoid = innerGrid.mul(facing.pow(0.7)).mul(2.4)
        const telemetryGlow = color('#00f5ff').mul(telemetry).mul(1.6)
        this.emissiveNode = innerVoid.add(telemetryGlow).mul(near.mul(0.6).add(0.5)).add(color('#ff007f').mul(rim).mul(0.25))
        break
      }
    }
  }
}

// Interoperability export alias
export const KnotMaterial = KnotMaterialPremium
