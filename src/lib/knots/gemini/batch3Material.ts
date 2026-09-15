import type {Node, Texture} from 'three/webgpu'

import {cameraPosition, color, float, mix, modelWorldMatrixInverse, mx_fractal_noise_float, mx_noise_float, mx_noise_vec3, negateOnBackSide, normalViewGeometry, positionGeometry, positionView, positionViewDirection, tangentView, time, uv, vec2, vec3, vec4} from 'three/tsl'
import {MeshPhysicalNodeMaterial} from 'three/webgpu'

import {cellularBoundary, cellularPoints} from '../cellularField.ts'

// ============================================================================
// Core Helper Mathematical Functions
// ============================================================================

export type Triple = [number, number, number]

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

export function opticalBands(phase: Node<'float'>) {
  const visibility = phase.fwidth().smoothstep(0.6, 3).oneMinus()
  return phase.cos().mul(visibility).mul(0.5).add(0.5)
}
export function cosinePalette(t: Node<'float'>, bias: Triple, amplitude: Triple, frequency: Triple, phase: Triple) {
  return vec3(...bias).add(vec3(...amplitude).mul(vec3(...frequency).mul(t).add(vec3(...phase)).mul(Math.PI * 2).cos()))
}

// ============================================================================
// Material Definitions & Catalog
// ============================================================================

export const knotFinishes = [
  {
    id: 'cryogenic_kintsugi',
    title: 'Cryogenic Kintsugi',
    accent: '#00f0ff',
  },
  {
    id: 'resonant_cymatics',
    title: 'Resonant Cymatics',
    accent: '#38ef7d',
  },
  {
    id: 'radiometric_guilloche',
    title: 'Radiometric Guilloché',
    accent: '#ffd27d',
  },
  {
    id: 'chromospheric_spicule',
    title: 'Chromospheric Spicule',
    accent: '#ff3b14',
  },
  {
    id: 'opaline_aerogel',
    title: 'Opaline Aerogel',
    accent: '#78c6ff',
  },
  {
    id: 'ferrofluid_monolith',
    title: 'Ferrofluid Monolith',
    accent: '#c850c0',
  },
  {
    id: 'photonic_morpho',
    title: 'Photonic Morpho',
    accent: '#0055ff',
  },
  {
    id: 'temporal_jacquard',
    title: 'Temporal Jacquard',
    accent: '#e2b868',
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
            // ----------------------------------------------------------------
            // 1. CRYOGENIC KINTSUGI: Fractured Glacial Ice & Superconducting Gold
            // ----------------------------------------------------------------
      case 'cryogenic_kintsugi': {
        const {p, view, rim, near, intimate} = viewerFrame()
                // Multi-depth voronoi fracture networks
        const shallow = p.sub(view.mul(0.06))
        const deep = p.sub(view.mul(0.18))
        const crackDistA = cellularBoundary(shallow.mul(18).add(mx_noise_vec3(shallow.mul(3)).mul(0.65)))
        const crackDistB = cellularBoundary(deep.mul(12).add(mx_noise_vec3(deep.mul(2)).mul(0.65)))
        const veinSurface = opticalLine(crackDistA, 0.025)
        const veinDeep = opticalLine(crackDistB, 0.035).mul(intimate)
        const veinNetwork = veinSurface.max(veinDeep)
                // Superconducting plasma pulses flowing through the faults
        const pulse = p.y.mul(22).add(p.x.mul(14)).add(time.mul(2.2)).sin().mul(0.5).add(0.5)
        const goldCore = mix(color('#ffaa00'), color('#fff5cc'), pulse)
        const cyanArc = color('#00f0ff').mul(pulse.pow(4)).mul(veinSurface)
                // Crystalline frost roughness and micro-bumpiness
        const frostNoise = mx_fractal_noise_float(p.mul(48), 3, 2, 0.6)
        const frostPatch = mx_noise_float(p.mul(6)).smoothstep(0.1, 0.5)
        this.colorNode = color('#021117')
        this.transmission = 0.94
        this.thickness = 0.75
        this.ior = 1.31 // Glacial Ice IOR
        this.dispersion = 0.55 // High prismatic spectral split
        this.attenuationColor.set('#46d2e8')
        this.attenuationDistance = 0.38
        this.roughnessNode = frostPatch.mul(frostNoise).mul(0.35).add(0.02)
        this.clearcoat = 1
        this.clearcoatRoughness = 0.02
        this.normalNode = proceduralNormal(frostNoise.mul(frostPatch).mul(0.15), 0.001)
        this.emissiveNode = goldCore.mul(veinNetwork).mul(2.8)
          .add(cyanArc.mul(4))
          .add(color('#00c8ff').mul(rim).mul(0.18))
          .mul(near.mul(0.6).add(0.6))
        break
      }
            // ----------------------------------------------------------------
            // 2. RESONANT CYMATICS: Chladni Nodal Acoustics on Polished Obsidian
            // ----------------------------------------------------------------
      case 'resonant_cymatics': {
        const {p, rim, near, intimate} = viewerFrame()
        const tube = uv()
                // Acoustic 2D standing-wave Chladni equation on the torus tube
        const u = tube.x.mul(Math.PI * 16)
        const v = tube.y.mul(Math.PI * 6)
                // Harmonic mode transitions
        const modeA = u.mul(3).cos().mul(v.mul(5).cos()).sub(u.mul(5).cos().mul(v.mul(3).cos()))
        const modeB = u.mul(4).cos().mul(v.mul(2).cos()).sub(u.mul(2).cos().mul(v.mul(4).cos()))
        const resonanceShift = time.mul(0.4).sin().mul(0.5).add(0.5)
        const chladni = mix(modeA, modeB, resonanceShift)
                // Luminescent quantum dust trapped strictly along nodal lines (where amplitude = 0)
        const nodalBand = chladni.abs().smoothstep(0.02, 0.14).oneMinus()
        const dustParticles = cellularPoints(p.mul(64).add(vec3(0, time.mul(0.2), 0)), 0.06, 0.22, 0.2).mul(nodalBand)
                // Obsidian ultrasonic micro-vibrations
        const vibrationRipples = chladni.mul(24).sin().mul(0.08)
        const obsidianNormal = proceduralNormal(vibrationRipples, 0.003)
        const phosphorColor = mix(color('#38ef7d'), color('#00f2fe'), resonanceShift)
        this.colorNode = color('#05070a')
        this.metalness = 0.12
        this.roughness = 0.035
        this.clearcoat = 1
        this.clearcoatRoughness = 0.02
        this.normalNode = obsidianNormal
                // Anisotropic acoustic shear around the tube
        this.anisotropy = 0.85
        this.anisotropyNode = tangentView.xy
        this.emissiveNode = phosphorColor.mul(dustParticles).mul(4.5).mul(intimate.mul(0.7).add(0.5))
          .add(color('#11998e').mul(nodalBand).mul(0.7))
          .add(color('#00ffea').mul(rim).mul(0.2))
          .mul(near.mul(0.5).add(0.5))
        break
      }
            // ----------------------------------------------------------------
            // 3. RADIOMETRIC GUILLOCHÉ: Horological Rosettes & Radium Scintillation
            // ----------------------------------------------------------------
      case 'radiometric_guilloche': {
        const {p, view, facing, near, intimate} = viewerFrame()
        const tube = uv()
                // Swiss rose-engine barleycorn guilloché equations
        const theta = tube.x.mul(Math.PI * 64)
        const phi = tube.y.mul(Math.PI * 18)
        const waveA = theta.add(phi.mul(3).sin().mul(4)).cos()
        const waveB = theta.mul(2).sub(phi.mul(6)).sin()
        const rosette = waveA.mul(waveB).abs().smoothstep(0.12, 0.7)
                // Dual-metal dial: 18K Rose Gold ribs and dark Ruthenium troughs
        const roseGold = color('#e0a48a')
        const ruthenium = color('#1c191e')
        const dialSurface = mix(ruthenium, roseGold, rosette)
                // Radium-226 alpha ionization sparks (stochastic scintillation)
        const tick = time.mul(28).floor()
        // Each tick reseeds compact ionization points, never whole glowing grid cells.
        const alphaSpark = cellularPoints(p.mul(85).add(vec3(0, 0, tick)), 0.025, 0.16, 0.7)
        const vaporTrail = mx_noise_float(p.mul(32).sub(view.mul(0.08))).smoothstep(0.6, 0.85)
        this.colorNode = dialSurface
        this.metalnessNode = rosette.mul(0.3).add(0.68)
        this.roughnessNode = rosette.mul(0.14).add(0.08)
        this.clearcoat = 1
        this.clearcoatRoughness = 0.03
        this.normalNode = proceduralNormal(rosette.mul(0.25), 0.004)
                // Radioactive phosphorescent emissions
        const radiumPhosphor = color('#55ff77')
        this.emissiveNode = radiumPhosphor.mul(alphaSpark).mul(6)
          .add(radiumPhosphor.mul(vaporTrail).mul(intimate).mul(1.2))
          .add(roseGold.mul(rosette).mul(facing.pow(3)).mul(0.25))
          .mul(near.mul(0.5).add(0.5))
        break
      }
            // ----------------------------------------------------------------
            // 4. CHROMOSPHERIC SPICULE: Solar Coronagraph & Relativistic Alfvén Flux
            // ----------------------------------------------------------------
      case 'chromospheric_spicule': {
        this.envMapIntensity = 0.15
        const {p, grazing, near, intimate} = viewerFrame()
        const tube = uv()
                // Convective solar granulation base
        const granule = cellularBoundary(p.mul(26).add(mx_noise_vec3(p.mul(4)).mul(0.6)))
        const cellBorders = granule.smoothstep(0.02, 0.1)
                // Magnetic loop arcades bursting across the knot
        const loopCoord = tube.y.mul(Math.PI * 6).sin().abs()
        const magneticTurbulence = mx_noise_float(vec3(p.x.mul(14), p.y.mul(5).add(time.mul(1.2)), p.z.mul(14)))
        const spiculeStream = loopCoord.pow(4).mul(magneticTurbulence.add(0.4)).clamp()
                // Relativistic Doppler beaming along the knot tangent flow
        const tangentFlow = tangentView.dot(positionViewDirection).clamp(-1, 1)
        const blueshift = tangentFlow.smoothstep(0, 0.8)
        const redshift = tangentFlow.negate().smoothstep(0, 0.8)
        const hAlphaRed = color('#ff1e00') // 656.3 nm Hydrogen-Alpha
        const heliumYellow = color('#ffd000')
        const coronalCyan = color('#00e5ff') // 10-million K EUV iron emission
        const plasmaTint = mix(mix(heliumYellow, hAlphaRed, redshift), coronalCyan, blueshift)
        this.colorNode = color('#050201')
        this.metalness = 0.1
        this.roughness = 0.85
        this.clearcoat = 0.3
        this.clearcoatRoughness = 0.2
        this.emissiveNode = plasmaTint.mul(spiculeStream).mul(4).mul(intimate.mul(0.8).add(0.6))
          .add(hAlphaRed.mul(cellBorders.oneMinus()).mul(1.5))
          .add(coronalCyan.mul(grazing.pow(4)).mul(2.2))
          .mul(near.mul(0.6).add(0.4))
        break
      }
            // ----------------------------------------------------------------
            // 5. OPALINE AEROGEL: "Frozen Smoke" with Rayleigh-Mie Forward Scatter
            // ----------------------------------------------------------------
      case 'opaline_aerogel': {
        const {p, view, facing, grazing, near, intimate} = viewerFrame()
                // True Rayleigh scattering phase: smoky-cyan backscatter vs fiery sunset-amber forward transmission
        const forwardPhase = facing.pow(3.5)
        const rayleighCyan = color('#1ca8db')
        const transmittedSunset = color('#ff6d24')
        const scatterColor = mix(rayleighCyan, transmittedSunset, forwardPhase)
                // Hypervelocity micrometeorite impact needle tunnels
        const deepTrackSample = p.sub(view.mul(0.12))
        const trackField = mx_noise_float(deepTrackSample.mul(36))
        const impactTrack = opticalLine(trackField, 0.02).mul(intimate)
        // Compact stardust inclusions, not entire glowing spatial cells.
        const stardustSparks = cellularPoints(p.mul(70), 0.03, 0.18, 0.65)
        this.colorNode = color('#02090f')
        this.transmission = 0.88
        this.thickness = 0.65
        this.ior = 1.06 // Ultra-low density silica aerogel
        this.attenuationColor.set('#ff8a43')
        this.attenuationDistance = 0.55
        this.roughness = 0.06
                // Silvery gossamer silica nanosphere sheen
        this.sheen = 0.95
        this.sheenRoughnessNode = float(0.25)
        this.sheenNode = color('#a2e8ff')
        this.emissiveNode = scatterColor.mul(forwardPhase).mul(1.8)
          .add(color('#ffe89e').mul(impactTrack).mul(3.5))
          .add(color('#ffffff').mul(stardustSparks).mul(2.5))
          .add(rayleighCyan.mul(grazing.pow(2.2)).mul(0.65))
          .mul(near.mul(0.5).add(0.5))
        break
      }
            // ----------------------------------------------------------------
            // 6. FERROFLUID MONOLITH: Hexagonal Rosensweig Spikes & Hydrocarbon Thin-Film
            // ----------------------------------------------------------------
      case 'ferrofluid_monolith': {
        const {rim, intimate} = viewerFrame()
        const tube = uv()
                // Hexagonal standing-wave lattice for Rosensweig spike cones
        const u1 = tube.x.mul(48)
        const u2 = tube.x.mul(24).add(tube.y.mul(41.569))
        const u3 = tube.x.mul(-24).add(tube.y.mul(41.569))
        const hexSum = u1.cos().add(u2.cos()).add(u3.cos()).div(3)
        const magneticPulse = time.mul(1.2).sin().mul(0.15).add(0.85)
        const spike = hexSum.max(0).pow(3.6).mul(magneticPulse)
                // Viscous liquid normal perturbation
        const spikeNormal = proceduralNormal(spike.mul(0.55), 0.012)
        this.colorNode = color('#020304')
        this.metalness = 0.2
        this.roughness = 0.025
        this.clearcoat = 1
        this.clearcoatRoughness = 0.015
        this.normalNode = spikeNormal
                // Thin hydrocarbon oil film iridescence focused at spike crests
        this.iridescence = 1
        this.iridescenceIOR = 1.6
        this.iridescenceThicknessNode = spike.mul(440).add(220)
                // Magnetic excitation pulse along the spike ridges
        const ridgePulse = spike.smoothstep(0.4, 0.9)
        this.emissiveNode = mix(color('#b300ff'), color('#00ffc4'), spike)
          .mul(ridgePulse).mul(1.8).mul(intimate.mul(0.6).add(0.5))
          .add(color('#001824').mul(rim).mul(0.4))
        break
      }
            // ----------------------------------------------------------------
            // 7. PHOTONIC MORPHO: Biomimetic Scale Nanocages & Coherent Bragg Diffraction
            // ----------------------------------------------------------------
      case 'photonic_morpho': {
        const {p, facing, near, intimate} = viewerFrame()
        const tube = uv()
                // Longitudinal nanoscale cuticle micro-ribs
        const microRibs = tube.x.mul(Math.PI * 480).sin().mul(0.5).add(0.5)
                // Discrete Bragg interference conditions (constructive wavelength reinforcement)
                // Constructive path: 2 * d * cos(theta) = m * lambda
        const braggPeakA = facing.sub(0.65).div(0.16).abs().pow(2).negate().exp() // Royal Cobalt Flash
        const braggPeakB = facing.sub(0.42).div(0.14).abs().pow(2).negate().exp() // Electric Cyan / UV Flash
        const morphoBlue = color('#003bff')
        const morphoCyan = color('#00f6ff')
        const structuralFlash = morphoBlue.mul(braggPeakA).add(morphoCyan.mul(braggPeakB.mul(0.8)))
                // Sub-dermal emerald bioluminescent breathing micro-pores
        const breath = time.mul(0.7).sin().mul(0.3).add(0.7)
        const pores = cellularPoints(p.mul(50), 0.04, 0.18).mul(breath).mul(intimate)
        this.colorNode = color('#040508')
        this.metalnessNode = structuralFlash.length().mul(0.65)
        this.roughnessNode = microRibs.mul(0.08).add(0.24)
                // Velvet chitin micro-sheen
        this.sheen = 0.8
        this.sheenRoughnessNode = float(0.4)
        this.sheenNode = color('#001845')
        this.normalNode = proceduralNormal(microRibs.mul(0.06), 0.002)
        this.emissiveNode = structuralFlash.mul(microRibs.mul(0.4).add(0.8)).mul(3.2)
          .add(color('#00ff88').mul(pores).mul(3))
          .mul(near.mul(0.5).add(0.5))
        break
      }
            // ----------------------------------------------------------------
            // 8. TEMPORAL JACQUARD: Woven Photonic Brocade & Dynamic Moiré Loom
            // ----------------------------------------------------------------
      case 'temporal_jacquard': {
        const {facing, grazing, near, intimate} = viewerFrame()
        const tube = uv()
                // Warp (longitudinal gold) and Weft (transverse silver) thread coordinates
        const u = tube.x.mul(190)
        const v = tube.y.mul(70)
        const warpMask = u.mul(Math.PI).sin().mul(v.mul(Math.PI).sin()).greaterThan(0)
        const threadCurve = u.mul(Math.PI).cos().abs().max(v.mul(Math.PI).cos().abs())
                // Dynamic holographic moiré interference between weave and viewing vector
        const moirePhase = u.mul(0.3).add(positionView.x.mul(80)).add(facing.mul(30))
        const moireFringes = opticalBands(moirePhase).mul(near)
                // Orthogonal anisotropic reflection between woven yarns
        const goldYarn = color('#fcd477')
        const silverSilk = color('#d2e3f5')
        const brocadeColor = warpMask.select(goldYarn, silverSilk)
        this.colorNode = brocadeColor
        this.metalnessNode = warpMask.select(float(0.94), float(0.82))
        this.roughnessNode = threadCurve.mul(0.12).add(0.18)
                // Heavy jacquard silk sheen
        this.sheen = 1
        this.sheenRoughnessNode = float(0.32)
        this.sheenNode = color('#fff1d4')
                // Woven thread relief normal
        this.normalNode = proceduralNormal(threadCurve.mul(0.35), 0.005)
                // Warp yarn anisotropic direction
        this.anisotropy = 0.9
        this.anisotropyNode = vec2(warpMask.select(tangentView.x, tangentView.y.negate()), warpMask.select(tangentView.y, tangentView.x))
        this.emissiveNode = mix(color('#ffe299'), color('#8bb7ff'), moireFringes)
          .mul(moireFringes).mul(0.45).mul(intimate.mul(0.6).add(0.4))
          .add(goldYarn.mul(grazing.pow(3)).mul(0.2))
        break
      }
    }
  }
}
