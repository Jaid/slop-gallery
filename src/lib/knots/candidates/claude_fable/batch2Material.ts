import type {Node, Texture} from 'three/webgpu'

import * as tsl from 'three/tsl'
import {cameraPosition, color, float, mix, modelWorldMatrixInverse, mx_fractal_noise_float, mx_noise_float, mx_noise_vec3, mx_worley_noise_vec2, negateOnBackSide, normalLocal, normalViewGeometry, normalWorld, pmremTexture, positionGeometry, positionView, positionViewDirection, positionWorld, time, uv, vec2, vec3, vec4} from 'three/tsl'
import {MeshPhysicalNodeMaterial} from 'three/webgpu'

// KnotMaterialPremium.ts
// Eight further finishes for the Infinity Knot. Every one of them is built around a
// "presence" idea: the sculpture notices you. It changes with the angle you look
// from (parallax, grazing light, retro glints) and with how close you dare to come
// (frost melts, plates change resonance, chromatophores blush, portals open).

// ───────────────────────────── shared helpers ─────────────────────────────

export const cellNoiseVec3 = (tsl as typeof tsl & {
  mx_cell_noise_vec3: (position: Node<'vec3'>) => Node<'vec3'>
}).mx_cell_noise_vec3

/** Everything a finish needs to know about who is looking, and from where. */
export function viewerFrame() {
  const p = positionGeometry
  const cameraLocal = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz
  const view = cameraLocal.sub(p).normalize()
  const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
  const grazing = facing.oneMinus()
  const distance = positionView.length()
  const objectDistance = cameraLocal.length()
  return {
    p,
    cameraLocal,
    view,
    facing,
    grazing,
    rim: grazing.pow(2),
    distance,
        /** whole-object distance: identical for every fragment, safe for global state like resonance modes */
    objectDistance,
    near: distance.smoothstep(1.25, 5.5).oneMinus(),
    intimate: distance.smoothstep(0.8, 2.7).oneMinus(),
  }
}

/** Pixel-exact thin line where a field crosses zero. */
export function hairline(field: Node<'float'>, width: Node<'float'> | number) {
  const footprint = field.fwidth().max(0.0001)
  return field.abs().smoothstep(width, footprint.mul(1.25).add(width)).oneMinus()
}

/** Soft-cored line that never gets thinner than a pixel; ideal for glowing cracks and lightning. */
export function ridge(field: Node<'float'>, width: Node<'float'> | number) {
  return field.abs().div(field.fwidth().mul(1.5).add(width)).oneMinus().clamp()
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

export function glints(normal: Node<'vec3'>, sharpness: number) {
  const lamps = [vec3(0.35, 0.78, 0.52), vec3(-0.62, 0.28, 0.73), vec3(0.1, -0.35, 0.93)]
  let sum: Node<'float'> = float(0)
  for (const lamp of lamps) {
    const half = lamp.normalize().add(positionViewDirection).normalize()
    sum = sum.add(normal.dot(half).clamp().pow(sharpness))
  }
  return sum
}

/** Black-body-ish ramp: coal → cherry → orange → straw white. */
export function ember(t: Node<'float'>) {
  const c = t.clamp()
  const low = mix(color('#1a0300'), color('#ff4a00'), c.mul(2).clamp())
  return mix(low, color('#fff0b8'), c.sub(0.5).mul(2).clamp().pow(1.4))
}

export function rotateY(v: Node<'vec3'>, angle: Node<'float'>) {
  const c = angle.cos()
  const s = angle.sin()
  return vec3(v.x.mul(c).sub(v.z.mul(s)), v.y, v.x.mul(s).add(v.z.mul(c)))
}

/** Wraps a periodic coordinate difference into [-0.5, 0.5). */
const wrap = (x: Node<'float'>) => x.sub(x.add(0.5).floor())

// ───────────────────────────── the finishes ─────────────────────────────

export const knotPremiumFinishes = [
  {
    id: 'damascus_ember',
    title: 'Damascus Ember',
    accent: '#ff6a1a',
  },
  {
    id: 'lichtenberg_reliquary',
    title: 'Lichtenberg Reliquary',
    accent: '#6d8dff',
  },
  {
    id: 'chladni_resonance',
    title: 'Chladni Resonance',
    accent: '#e8d8b2',
  },
  {
    id: 'abyssal_chromatophore',
    title: 'Abyssal Chromatophore',
    accent: '#2fe8ff',
  },
  {
    id: 'washi_lantern',
    title: 'Washi Lantern',
    accent: '#ffb36a',
  },
  {
    id: 'kintsugi_obsidian',
    title: 'Kintsugi Obsidian',
    accent: '#ffd77a',
  },
  {
    id: 'threshold_mirror',
    title: 'Threshold Mirror',
    accent: '#7ff5ff',
  },
  {
    id: 'glacial_aurora',
    title: 'Glacial Aurora',
    accent: '#2dff9a',
  },
] as const
export type KnotPremiumFinish = typeof knotPremiumFinishes[number]['id']

export class KnotMaterialPremium extends MeshPhysicalNodeMaterial {
  constructor(finish: KnotPremiumFinish, environment: Texture) {
    super({
      envMap: environment,
      envMapIntensity: 0.9,
    })
    this.name = finish
    switch (finish) {
            // Folded, brushed damascus steel, still cooling from the forge. Temper colours bloom around
            // fissures; embers deep in the cracks breathe faster and brighter the closer you come.
      case 'damascus_ember': {
        const {p, view, grazing, near, intimate} = viewerFrame()
        const tube = uv()
        const fold = mx_noise_float(p.mul(2.6)).mul(5).add(mx_noise_float(p.mul(7.5).add(vec3(3.1, 7.7, 1.3))).mul(1.6))
        const layerPhase = p.y.mul(38).add(tube.x.mul(Math.PI * 6).sin().mul(2)).add(fold)
        const layers = layerPhase.sin().mul(0.5).add(0.5)
        const bright = layers.smoothstep(0.35, 0.65)
        const etch = hairline(layerPhase.sin(), 0.08)
        const fissureField = mx_fractal_noise_float(p.mul(3.4).add(vec3(0, time.mul(0.02), 0)), 3, 2.1, 0.55)
        const fissureWidth = mx_noise_float(p.mul(5)).mul(0.5).add(0.5).mul(0.05).add(0.012)
        const fissure = fissureField.abs().div(fissureWidth.max(fissureField.fwidth().mul(1.5))).oneMinus().clamp().pow(1.5)
        const temper = fissureField.abs().smoothstep(0.02, 0.28).oneMinus()
        const inner = p.sub(view.mul(0.03))
        const emberNoise = mx_noise_float(inner.mul(9).add(vec3(0, time.mul(-0.25), 0))).mul(0.5).add(0.5)
        const pulse = tube.x.mul(Math.PI * 2 * 5).sub(time.mul(1.1)).sin().mul(0.5).add(0.5).pow(3)
        const heat = fissure.mul(emberNoise.mul(0.6).add(0.4)).mul(pulse.mul(0.6).add(0.4)).mul(near.mul(0.75).add(0.25))
        const steel = mix(color('#4c545e'), color('#cfd6de'), bright).mul(etch.mul(0.5).oneMinus())
        const scorched = mix(steel, color('#1d1418'), temper.mul(0.55))
        this.colorNode = mix(scorched, color('#2b0b03'), fissure)
        this.metalnessNode = fissure.mul(0.6).oneMinus()
        this.roughnessNode = float(0.22).mix(0.42, bright.oneMinus()).add(temper.mul(0.15)).add(fissure.mul(0.3))
        this.anisotropy = 1
        const brushAngle = mx_noise_float(p.mul(4)).mul(0.25).add(layers.mul(0.2))
        this.anisotropyNode = vec2(brushAngle.cos(), brushAngle.sin()).mul(bright.mul(0.35).add(0.55)).mul(fissure.oneMinus())
        this.iridescence = 1
        this.iridescenceNode = temper.mul(fissure.oneMinus()).mul(0.9)
        this.iridescenceIOR = 1.8
        this.iridescenceThicknessNode = temper.mul(-260).add(620)
        this.normalNode = proceduralNormal(bright.mul(0.6).sub(fissure.mul(1.2)).add(mx_noise_float(p.mul(30)).mul(0.08)), 0.0012)
        this.emissiveNode = ember(heat.mul(1.3)).mul(heat).mul(3.2)
          .add(color('#ff6a1a').mul(temper).mul(near).mul(pulse).mul(0.06))
          .add(color('#ff8a3a').mul(grazing.pow(4)).mul(intimate).mul(0.04))
        break
      }
            // A lightning strike frozen inside a block of amber acrylic. Four parallax strata of branching
            // discharge lie at different depths, so the tree shifts as you circle it; the closer you stand,
            // the more often a surge runs the branches again.
      case 'lichtenberg_reliquary': {
        const {p, view, grazing, near} = viewerFrame()
        const bolt = (q: Node<'vec3'>, seed: number) => {
          const warp = mx_noise_float(q.mul(1.7).add(seed)).mul(0.35)
          const trunkField = mx_noise_float(q.mul(2.4).add(vec3(warp, seed, warp.negate())))
          const trunk = ridge(trunkField, 0.012)
          const branchField = mx_noise_float(q.mul(6.5).add(trunkField.mul(0.8)).add(seed * 1.7))
          const branch = ridge(branchField, 0.006).mul(trunkField.abs().smoothstep(0.03, 0.32).oneMinus())
          const twigField = mx_noise_float(q.mul(16).add(branchField.mul(0.6)).add(seed * 2.3))
          const twig = ridge(twigField, 0.004).mul(branchField.abs().smoothstep(0.02, 0.18).oneMinus()).mul(trunkField.abs().smoothstep(0.05, 0.4).oneMinus())
          const halo = trunkField.abs().smoothstep(0, 0.12).oneMinus()
          const phase = q.y.mul(9).add(trunkField.mul(4)).add(seed)
          return {
            trunk,
            branch,
            twig,
            halo,
            phase,
          }
        }
        let lightning: Node<'vec3'> = vec3(0)
        const depths = [0.03, 0.08, 0.14, 0.21]
        for (const [i, depth] of depths.entries()) {
          const q = p.sub(view.mul(depth))
          const {trunk, branch, twig, halo, phase} = bolt(q, i * 13.7 + 2.1)
          const flicker = mx_noise_float(vec3(time.mul(1.9).add(i * 5.3), i * 3.1, time.mul(0.7)))
          const gate = flicker.smoothstep(near.mul(-0.3).add(0.42), near.mul(-0.3).add(0.6))
          const surge = phase.sub(time.mul(2.2)).sin().mul(0.5).add(0.5).pow(6).mul(gate)
          const energy = surge.mul(2.5).add(0.18)
          const shape = trunk.add(branch.mul(0.7)).add(twig.mul(0.45))
          const core = trunk.pow(3).add(branch.pow(3).mul(0.6))
          const depthFade = 1 - i * 0.18
          lightning = lightning
            .add(mix(color('#6d8dff'), color('#f6f9ff'), core).mul(shape).mul(energy).mul(depthFade))
            .add(color('#8b57ff').mul(halo).mul(surge).mul(0.25 * depthFade))
        }
        this.colorNode = color('#5a2a06')
        this.transmission = 0.9
        this.thickness = 0.45
        this.ior = 1.49
        this.dispersion = 0.15
        this.attenuationColor.set('#c2711a')
        this.attenuationDistance = 0.7
        this.roughness = 0.02
        this.metalness = 0
        this.clearcoat = 1
        this.clearcoatRoughness = 0.02
        this.normalNode = proceduralNormal(mx_noise_float(p.mul(11)).mul(0.2), 0.0006)
        this.emissiveNode = lightning.mul(near.mul(0.6).add(0.45)).add(color('#ff9a2e').mul(grazing.pow(3)).mul(0.08))
        break
      }
            // A vibrating indigo enamel plate. Fine sand gathers on the nodal lines of a Chladni mode; step
            // closer and the plate rises through higher modes, the sand re-drawing itself into denser figures.
      case 'chladni_resonance': {
        const {p, near, intimate, objectDistance} = viewerFrame()
        const tube = uv()
        const X = tube.x.mul(16)
        const Y = tube.y.mul(2)
        const chladni = (n: number, m: number) => X.mul(n * Math.PI).cos().mul(Y.mul(m * Math.PI).cos()).sub(X.mul(m * Math.PI).cos().mul(Y.mul(n * Math.PI).cos()))
        const modes: Array<[number, number]> = [[1, 3], [2, 5], [3, 7], [4, 9], [5, 12]]
        const drift = time.mul(0.11).sin().mul(0.45)
        const s = objectDistance.smoothstep(1.2, 6).oneMinus().mul(modes.length - 1).add(drift).clamp(0, modes.length - 1)
        let field: Node<'float'> = float(0)
        for (const [k, [n, m]] of modes.entries()) {
          field = field.add(chladni(n, m).mul(s.sub(k).abs().oneMinus().clamp()))
        }
        const fw = field.fwidth().max(0.002)
        const nodal = field.abs().smoothstep(0.02, fw.mul(1.5).add(0.09)).oneMinus()
        const grainCoord = p.mul(260)
        const grainRnd = cellNoiseVec3(grainCoord)
        const grainDist = grainCoord.fract().sub(grainRnd.mul(0.5).add(0.25)).length()
        const grainFoot = grainCoord.fwidth().length().max(0.001)
        const grainSharp = grainFoot.smoothstep(0.35, 1.2).oneMinus()
        const grain = grainDist.smoothstep(0.18, grainFoot.mul(0.7).add(0.28)).oneMinus().mul(grainSharp).add(grainSharp.oneMinus().mul(0.6))
        const stray = grainRnd.y.smoothstep(0.93, 0.95).mul(grain).mul(field.abs().smoothstep(0.05, 0.5)).mul(0.6)
        const sand = nodal.mul(grain.mul(0.7).add(0.3)).add(stray).clamp()
        const plate = mix(color('#0d1330'), color('#1f2f6a'), mx_noise_float(p.mul(3)).mul(0.5).add(0.5).mul(0.35))
        const sandColor = mix(color('#d9c9a5'), color('#fff5e0'), grainRnd.x)
        const vibration = time.mul(42).sin()
        this.colorNode = mix(plate, sandColor, sand)
        this.metalnessNode = sand.oneMinus().mul(0.7)
        this.roughnessNode = float(0.22).mix(0.85, sand)
        this.clearcoatNode = sand.oneMinus().mul(0.9)
        this.clearcoatRoughness = 0.06
        this.normalNode = proceduralNormal(sand.mul(0.9).add(grain.mul(nodal).mul(0.6)).add(field.mul(vibration).mul(0.4)), 0.0016)
        this.positionNode = positionGeometry.add(normalLocal.mul(field.mul(vibration).mul(near.mul(0.6).add(0.4)).mul(0.003)))
        const grainNormal = normalViewGeometry.add(grainRnd.sub(0.5).mul(0.5)).normalize()
        const sparkle = glints(grainNormal, 120).mul(sand).mul(grain).mul(near).mul(0.35)
        const hum = field.abs().smoothstep(0.3, 1.6).mul(vibration.mul(0.5).add(0.5))
        this.emissiveNode = color('#fff2d8').mul(sparkle).add(color('#2e4bd8').mul(hum).mul(intimate).mul(0.08))
        break
      }
            // Deep-sea skin. Velvet-black with pigment cells that dilate toward whoever is looking and blush
            // in waves along the body; photophores flash in a travelling sweep, and when you stare straight
            // at it, the photophores stare back.
      case 'abyssal_chromatophore': {
        const {p, facing, grazing, rim, near, intimate} = viewerFrame()
        const tube = uv()
        const skinNoise = mx_noise_float(p.mul(18))
        const cq = p.mul(26).add(skinNoise.mul(0.15))
        const cr = cellNoiseVec3(cq)
        const cr2 = cellNoiseVec3(cq.add(vec3(17.3, 5.9, 41.2)))
        const cdist = cq.fract().sub(cr.mul(0.5).add(0.25)).length()
        const cfoot = cq.fwidth().length().max(0.001)
        const wave = tube.x.mul(Math.PI * 2 * 3).sub(time.mul(1.4)).add(cr2.z.mul(1.5)).sin().mul(0.5).add(0.5)
        const arousal = facing.pow(1.4).mul(near.mul(0.7).add(0.3))
        const radius = arousal.mul(wave.mul(0.5).add(0.5)).mul(0.32).add(0.04).mul(cr2.x.mul(0.5).add(0.75))
        const chroma = cdist.smoothstep(radius.sub(cfoot), radius.add(cfoot.mul(0.6))).oneMinus().mul(cfoot.smoothstep(0.35, 1.2).oneMinus())
        const pigment = mix(mix(color('#d8213f'), color('#ff8a1f'), cr.y), color('#6b1030'), cr2.y.mul(0.5))
        const pq = p.mul(11).add(vec3(3.7, 1.1, 9.4))
        const pr = cellNoiseVec3(pq)
        const pr2 = cellNoiseVec3(pq.add(vec3(7.7, 23.1, 3.3)))
        const pdist = pq.fract().sub(pr.mul(0.6).add(0.2)).length()
        const pfoot = pq.fwidth().length().max(0.001)
        const present = pr2.x.smoothstep(0.55, 0.6)
        const photophore = pdist.smoothstep(0.045, pfoot.mul(0.8).add(0.07)).oneMinus().mul(present)
        const sweep = tube.x.mul(Math.PI * 2 * 2).sub(time.mul(0.9)).sin().mul(0.5).add(0.5).pow(10)
        const twinkle = time.mul(pr2.y.mul(3).add(1)).add(pr2.z.mul(20)).sin().mul(0.5).add(0.5)
        const glowGate = sweep.mul(1.2).add(twinkle.mul(0.25)).add(intimate.mul(0.5))
        const bioColor = mix(color('#2fe8ff'), color('#b8fff1'), pr2.z)
        const eyeshine = photophore.mul(facing.pow(10)).mul(near)
        const halo = pdist.smoothstep(0, 0.35).oneMinus().mul(present).mul(glowGate)
        this.colorNode = mix(color('#070310'), pigment, chroma.mul(0.9))
        this.metalness = 0
        this.roughnessNode = float(0.55).mix(0.3, chroma)
        this.sheen = 1
        this.sheenNode = mix(color('#5a3fbf'), color('#ff6aa8'), grazing).mul(0.75)
        this.sheenRoughnessNode = float(0.6)
        this.clearcoatNode = float(0.6).add(photophore.mul(0.4))
        this.clearcoatRoughness = 0.12
        this.retroreflectivity = 0.5
        this.retroreflectivityNode = photophore.mul(0.9)
        this.normalNode = proceduralNormal(chroma.mul(0.7).add(photophore.mul(1.2)).add(skinNoise.mul(0.12)), 0.0011)
        this.emissiveNode = bioColor.mul(photophore).mul(glowGate).mul(1.8)
          .add(bioColor.mul(halo).mul(0.35))
          .add(color('#ffffff').mul(eyeshine).mul(2.5))
          .add(color('#3a1a8a').mul(rim).mul(0.18))
          .add(pigment.mul(chroma).mul(intimate).mul(0.08))
        break
      }
            // A knot of hand-made paper lit from within by six guttering candles. Ink-painted plum branches
            // and blossoms on the inner skin show as silhouettes that slide with parallax, and when you come
            // close a moth's shadow flutters along the inside of the lantern.
      case 'washi_lantern': {
        const {p, view, facing, grazing, near, intimate} = viewerFrame()
        const tube = uv()
        const fibres = mx_fractal_noise_float(vec3(tube.x.mul(520), tube.y.mul(14), 2.5), 3, 2.3, 0.55).mul(0.5).add(0.5)
        const fibres2 = mx_fractal_noise_float(vec3(tube.x.mul(60), tube.y.mul(180), 7.1), 2, 2, 0.5).mul(0.5).add(0.5)
        const pulp = mx_fractal_noise_float(p.mul(7), 3, 2, 0.5).mul(0.5).add(0.5)
        const thickness = pulp.mul(0.5).add(fibres.mul(0.3)).add(fibres2.mul(0.2))
        const transmittance = thickness.mul(-0.55).add(1.05).clamp()
        const candles = 6
        const candleId = tube.x.mul(candles).floor()
        const along = tube.x.mul(candles).fract().sub(0.5).abs()
        const flicker = mx_noise_float(vec3(time.mul(2.7), candleId.mul(7.31), time.mul(1.3))).mul(0.3)
          .add(mx_noise_float(vec3(time.mul(9), candleId.mul(3.7), 0)).mul(0.12)).add(0.8)
        const flame = along.mul(3).pow(2).negate().exp()
        const inner = p.sub(view.mul(0.025))
        const branchField = mx_noise_float(inner.mul(3.2).add(mx_noise_float(inner.mul(1.4)).mul(0.5)))
        const branchWidth = mx_noise_float(inner.mul(2.1).add(9)).mul(0.5).add(0.5).mul(0.05).add(0.006)
        const branch = branchField.abs().div(branchWidth.max(branchField.fwidth().mul(1.5))).oneMinus().clamp().pow(0.7)
        const twigField = mx_noise_float(inner.mul(9).add(branchField.mul(1.5)))
        const twig = ridge(twigField, 0.01).mul(branchField.abs().smoothstep(0.02, 0.25).oneMinus())
        const ink = branch.max(twig.mul(0.8))
        const bq = inner.mul(22)
        const br = cellNoiseVec3(bq)
        const bdist = bq.fract().sub(br.mul(0.5).add(0.25)).length()
        const blossom = bdist.smoothstep(0.1, 0.2).oneMinus().mul(br.z.smoothstep(0.6, 0.65)).mul(branchField.abs().smoothstep(0.02, 0.2).oneMinus())
        const du = wrap(tube.x.sub(time.mul(0.045).fract()))
        const dv = wrap(tube.y.sub(time.mul(0.31).sin().mul(0.18).add(0.5)))
        const flap = time.mul(14).sin().mul(0.5).add(0.5)
        const moth = du.mul(du).mul(1800).add(dv.mul(dv).mul(flap.mul(40).add(60))).negate().exp().mul(intimate.mul(0.6).add(0.4))
        const shade = ink.mul(0.9).add(blossom.mul(0.35)).add(moth.mul(0.7)).clamp().oneMinus()
        const lit = flame.mul(flicker).mul(transmittance).mul(facing.mul(0.45).add(0.55))
        const flameColor = mix(color('#ff7a1c'), color('#ffd9a0'), flame.mul(flicker).clamp())
        this.colorNode = mix(color('#f1e4cc'), color('#d8c7a6'), thickness).mul(ink.mul(0.55).oneMinus())
        this.roughnessNode = float(0.85).sub(pulp.mul(0.1))
        this.metalness = 0
        this.sheen = 1
        this.sheenNode = color('#fff6e6').mul(0.5)
        this.sheenRoughnessNode = float(0.85)
        this.normalNode = proceduralNormal(thickness.mul(0.8).add(fibres.mul(0.4)), 0.0009)
        this.emissiveNode = flameColor.mul(lit).mul(shade).mul(1.6).mul(near.mul(0.25).add(0.85))
          .add(color('#ff9fb6').mul(blossom).mul(lit))
          .add(color('#ffb36a').mul(grazing.pow(2)).mul(flame).mul(flicker).mul(0.15))
        break
      }
            // Shattered volcanic glass mended with gold. Molten light travels the seams; at grazing angles
            // the conchoidal fracture planes inside the black glass surface like smoke.
      case 'kintsugi_obsidian': {
        const {p, view, grazing, rim, near} = viewerFrame()
        const shards = p.mul(5.5).add(mx_noise_float(p.mul(2)).mul(0.25))
        const worley = mx_worley_noise_vec2(shards, 1)
        const edgeDist = worley.y.sqrt().sub(worley.x.sqrt())
        const seamWidth = mx_noise_float(p.mul(4.5).add(3.3)).mul(0.5).add(0.5).mul(0.06).add(0.012)
        const seamFoot = edgeDist.fwidth().mul(1.2)
        const seam = edgeDist.smoothstep(seamWidth, seamWidth.add(seamFoot).add(0.01)).oneMinus()
        const seamCore = edgeDist.smoothstep(seamWidth.mul(0.4), seamWidth.mul(0.4).add(seamFoot)).oneMinus()
        const fine = mx_worley_noise_vec2(p.mul(13).add(vec3(5.1, 2.2, 7.7)), 1)
        const fineEdge = fine.y.sqrt().sub(fine.x.sqrt())
        const hairlineCrack = fineEdge.smoothstep(0, fineEdge.fwidth().mul(1.5).add(0.008)).oneMinus().mul(seam.oneMinus()).mul(mx_noise_float(p.mul(3).add(8)).smoothstep(0.05, 0.4))
        const inner = p.sub(view.mul(0.06))
        const conchoid = inner.dot(vec3(3.1, 7.4, -2.2)).mul(9).add(mx_noise_float(inner.mul(4)).mul(6)).sin()
        const planes = conchoid.abs().smoothstep(0, conchoid.fwidth().mul(2).add(0.08)).oneMinus().mul(grazing.pow(1.5)).mul(near)
        const smoke = mx_fractal_noise_float(inner.mul(3), 3, 2, 0.5).mul(0.5).add(0.5)
        const flowPhase = mx_noise_float(p.mul(1.8)).mul(7).add(p.y.mul(5)).sub(time.mul(0.8))
        const flow = flowPhase.sin().mul(0.5).add(0.5).pow(8)
        const goldBase = mix(color('#b8771f'), color('#ffd77a'), seamCore)
        const obsidian = mix(color('#050408'), color('#1b1a26'), smoke.mul(grazing).mul(0.6))
        this.colorNode = mix(obsidian, goldBase, seam)
        this.metalnessNode = seam
        this.roughnessNode = float(0.04).mix(0.3, seam).add(hairlineCrack.mul(0.2))
        this.clearcoatNode = seam.oneMinus()
        this.clearcoatRoughness = 0.02
        this.iridescence = 1
        this.iridescenceNode = grazing.pow(2).mul(seam.oneMinus()).mul(0.35)
        this.iridescenceIOR = 1.3
        this.iridescenceThicknessNode = smoke.mul(300).add(250)
        this.normalNode = proceduralNormal(seam.add(seamCore.mul(0.5)).sub(hairlineCrack.mul(0.6)).add(mx_noise_float(p.mul(40)).mul(0.03)), 0.0016)
        const seamGlint = glints(normalViewGeometry.add(mx_noise_vec3(p.mul(60)).mul(0.08)).normalize(), 50)
        this.emissiveNode = color('#ffb347').mul(seam).mul(flow).mul(near.mul(0.7).add(0.3)).mul(1.4)
          .add(goldBase.mul(seam).mul(seamGlint).mul(0.4))
          .add(color('#c8d4ea').mul(planes).mul(0.35))
          .add(color('#ffffff').mul(hairlineCrack).mul(glints(normalViewGeometry, 30)).mul(0.25))
          .add(color('#4a2a10').mul(rim).mul(0.1))
        break
      }
            // A chrome knot whose reflection is slightly wrong: the mirrored world drifts. Face it squarely
            // and step closer, and the surface opens like a portal, showing the world *behind* the knot,
            // split into faint spectral fringes, with a luminous threshold line crawling around the opening.
      case 'threshold_mirror': {
        this.envMapIntensity = 0
        const {p, facing, near, intimate} = viewerFrame()
        const toSurface = positionWorld.sub(cameraPosition).normalize()
        const wobble = mx_noise_vec3(p.mul(5).add(vec3(0, time.mul(0.12), 0)))
        const n = normalWorld.add(wobble.mul(0.035)).normalize()
        const reflected = rotateY(toSurface.reflect(n), time.mul(0.07))
        const mirror = pmremTexture(environment, reflected, facing.oneMinus().mul(0.06).add(0.02))
        const bend = near.mul(0.05).add(0.02)
        const through = (k: number) => pmremTexture(environment, rotateY(toSurface.refract(n, float(1).sub(bend.mul(k))), time.mul(-0.11)), float(0.02))
        const window = vec3(through(0.5).x, through(1).y, through(1.5).z).mul(vec3(0.85, 0.95, 1.1))
        const veilNoise = mx_fractal_noise_float(p.mul(3).add(vec3(time.mul(0.05), 0, 0)), 3, 2, 0.5).mul(0.12)
        const threshold = near.mul(0.42).add(0.22)
        const aperture = facing.add(veilNoise)
        const openness = aperture.smoothstep(threshold.sub(0.1), threshold.add(0.1))
        const edge = aperture.sub(threshold).div(0.035).pow(2).negate().exp()
        const edgeColor = mix(color('#7ff5ff'), color('#ffffff'), intimate)
        this.colorNode = color('#000000')
        this.metalness = 1
        this.roughness = 1
        this.emissiveNode = mix(mirror, window, openness).add(edgeColor.mul(edge).mul(near.mul(0.6).add(0.4)).mul(1.2))
        break
      }
            // Glacier ice with an aurora trapped inside. Frost ferns cover it from afar; your approach melts
            // them back to a glistening water line, revealing clear ice, frozen bubbles, and four depth
            // layers of curtains that drift as you walk around.
      case 'glacial_aurora': {
        const {p, view, rim, near, intimate} = viewerFrame()
        const frostField = mx_fractal_noise_float(p.mul(4.5), 3, 2.1, 0.55).mul(0.5).add(0.5)
        const fern = mx_noise_float(p.mul(21).add(frostField.mul(2)))
        const dendrite = ridge(fern, 0.05)
        const melt = intimate.mul(0.7).add(near.mul(0.2))
        const frostLevel = frostField.sub(melt.mul(0.55)).add(dendrite.mul(0.12))
        const frost = frostLevel.smoothstep(0.32, 0.6)
        const meltLine = frostLevel.sub(0.34).abs().div(0.05).pow(2).negate().exp()
        let aurora: Node<'vec3'> = vec3(0)
        const depths = [0.05, 0.11, 0.18, 0.26]
        for (const [i, depth] of depths.entries()) {
          const q = p.sub(view.mul(depth))
          const curtainNoise = mx_noise_float(vec3(q.x.mul(2.6).add(time.mul(0.06)), q.z.mul(2.6).sub(i * 0.7), time.mul(0.03)))
          const curtain = curtainNoise.abs().smoothstep(0.02, 0.35).oneMinus()
          const rays = q.x.mul(28).add(q.z.mul(17)).add(mx_noise_float(q.mul(3).add(i)).mul(6)).add(time.mul(0.4)).sin().mul(0.5).add(0.5).pow(3)
          const altitude = q.y.mul(2.2).add(0.5).add(mx_noise_float(q.mul(1.5)).mul(0.3))
          const tint = mix(color('#2dff9a'), color('#c05bff'), altitude.clamp())
          aurora = aurora.add(tint.mul(curtain).mul(rays.mul(0.6).add(0.4)).mul(1 - i * 0.18))
        }
        const bq = p.sub(view.mul(0.045)).mul(64)
        const brnd = cellNoiseVec3(bq)
        const bdist = bq.fract().sub(brnd.mul(0.6).add(0.2)).length()
        const bfoot = bq.fwidth().length().max(0.001)
        const bubbles = bdist.smoothstep(0.05, bfoot.mul(0.8).add(0.09)).oneMinus().mul(brnd.z.smoothstep(0.82, 0.86)).mul(bfoot.smoothstep(0.3, 1.1).oneMinus())
        this.colorNode = mix(color('#0f2733'), color('#e9f6ff'), frost)
        this.transmissionNode = frost.mul(-0.85).add(0.9).clamp()
        this.thickness = 0.5
        this.ior = 1.31
        this.dispersion = 0.1
        this.attenuationColor.set('#6fc3de')
        this.attenuationDistance = 0.8
        this.roughnessNode = float(0.03).mix(0.6, frost).sub(meltLine.mul(0.03)).clamp()
        this.metalness = 0
        this.clearcoatNode = frost.oneMinus().mul(0.9).add(meltLine.mul(0.6)).clamp()
        this.clearcoatRoughness = 0.03
        this.normalNode = proceduralNormal(frost.mul(0.5).add(dendrite.mul(frost).mul(0.5)).add(mx_noise_float(p.mul(9)).mul(0.1)), 0.0014)
        const frostGlint = glints(normalViewGeometry.add(mx_noise_vec3(p.mul(80)).mul(0.25)).normalize(), 80).mul(frost).mul(dendrite.mul(0.5).add(0.5))
        const auroraVisible = aurora.mul(frost.mul(0.75).oneMinus()).mul(near.mul(0.5).add(0.5))
        this.emissiveNode = auroraVisible.mul(0.9)
          .add(color('#e9fbff').mul(frostGlint).mul(0.35))
          .add(color('#8ee6ff').mul(bubbles).mul(near).mul(0.5))
          .add(color('#3ac9ff').mul(rim).mul(0.1))
          .add(color('#ffffff').mul(meltLine).mul(intimate).mul(0.08))
        break
      }
    }
  }
}
