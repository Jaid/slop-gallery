import type {Node, Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, mx_noise_vec3, mx_worley_noise_vec3, select, time, transformNormalToView, uv, varying, vec2, vec3} from 'three/tsl'

import {detailNormal} from '../../candidates/deepseek/lib/detailNormal.ts'
import {ramp} from '../../candidates/deepseek/lib/ramp.ts'
import {tubeMetric} from '../../candidates/deepseek/lib/tubeMetric.ts'
import {cellNoiseVec3} from '../../lib/cellNoiseVec3.ts'
import {displacementView} from '../../lib/displacementView.ts'
import {glints} from '../../lib/glints.ts'
import {knotFrame} from '../../lib/knotFrame.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {spectralColor} from '../../lib/spectralColor.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

const pigmentPalette = (b: Node<'float'>) => {
  const sepia = color('#2e1608')
  const rust = color('#b34712')
  const ochre = color('#d4a23a')
  const teal = color('#0d6b66')
  const violet = color('#7a2f70')
  const cream = color('#f2e6d0')
  return select(b.lessThan(0.22), sepia, select(b.lessThan(0.4), rust, select(b.lessThan(0.57), ochre, select(b.lessThan(0.74), teal, select(b.lessThan(0.89), violet, cream)))))
}
/** Chromatophore sacs on a wet, breathing skin. Their muscles pull the pigment open in travelling weather fronts; approaching light wakes the papillae, and the dermal iridophores answer at grazing angles. */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 1.05)
    this.name = knotData.id
    const {facing, grazing, near} = viewerFrame()
    const camera = displacementView()
    const metric = tubeMetric(uv())
    const drift = time.mul(0.04)
    const warp = mx_noise_vec3(vec3(metric.mul(2.7), drift)).mul(0.09)
    const papillaHeight = (tube: Node<'vec2'>, force: Node<'float'>) => {
      const m = tubeMetric(tube)
      const noiseMask = mx_noise_float(vec3(m.mul(2.9), 2.1)).mul(0.5).add(0.5)
      const patch = noiseMask.smoothstep(0.38, 0.72)
      const bumps = mx_worley_noise_vec3(vec3(m.mul(8.6).add(warp.xy), 5.2), 1, 0)
      const bump = ramp(bumps.x, 0.46, 0.02).pow(1.35)
      const breathe = m.x.mul(2.3).sub(time.mul(0.55)).sin().mul(0.0005)
      const wrinkle = mx_noise_float(vec3(m.mul(19), time.mul(0.08))).mul(0.00055)
      return bump.mul(patch).mul(force).mul(0.0085).add(breathe).add(wrinkle)
    }
    const displaced = (tube: Node<'vec2'>, force: Node<'float'>) => {
      const frame = knotFrame(tube)
      return frame.position.add(frame.normal.mul(papillaHeight(tube, force)))
    }
    const force = camera.near.mul(0.82).add(0.18)
    const eps = 0.0001
    const du = displaced(uv().add(vec2(eps, 0)), force).sub(displaced(uv().sub(vec2(eps, 0)), force))
    const dv = displaced(uv().add(vec2(0, eps)), force).sub(displaced(uv().sub(vec2(0, eps)), force))
    const geometryNormal = varying(transformNormalToView(du.cross(dv).normalize())).normalize()
    this.positionNode = displaced(uv(), force)
    const chromatophores = (scale: number, seed: number, openBias: Node<'float'>) => {
      const q = vec3(metric.mul(scale).add(warp.xy.mul(scale * 0.6)), seed)
      const cells = mx_worley_noise_vec3(q, 1, 0)
      const d = cells.x
      const rnd = cellNoiseVec3(q.floor())
      const rnd2 = cellNoiseVec3(q.floor().add(vec3(7.3, -3.1, seed)))
      const front = metric.x.mul(1.35).sub(time.mul(0.52)).add(rnd.x.mul(5.8)).add(warp.x.mul(9)).sin().mul(0.5).add(0.5)
      const activation = front.mul(0.78).add(rnd.y.mul(0.42)).add(openBias).clamp(0, 1)
      const open = activation.smoothstep(0.3, 0.75)
      const radius = open.mul(0.17).add(0.22)
      const sac = ramp(d, radius, radius.mul(0.82))
      const rim = ramp(d.sub(radius.mul(0.96)).abs(), 0.034, 0.004)
      return {
        sac,
        rim,
        open,
        rnd,
        rnd2,
        radius,
      }
    }
    const large = chromatophores(13, 2.1, near.mul(0.22))
    const small = chromatophores(34, 7.4, near.mul(0.34).add(0.08))
    const largePigment = pigmentPalette(large.rnd.z)
    const smallPigment = pigmentPalette(small.rnd2.z)
    const mottling = mx_noise_float(vec3(metric.mul(4.1), time.mul(0.025))).mul(0.5).add(0.5)
    const clouds = mx_noise_vec3(vec3(metric.mul(1.45), time.mul(0.018))).mul(0.5).add(0.5)
    const cloudPalette = pigmentPalette(clouds.z)
    const coolCloud = mix(color('#0e3d3a'), color('#4d2350'), clouds.y)
    const warmCloud = mix(color('#7a4a22'), color('#c89a4a'), clouds.x)
    const cloudColor = select(clouds.z.lessThan(0.48), coolCloud, warmCloud)
    const baseSkin = mix(mix(mix(color('#6b4a36'), color('#b89a78'), mottling), cloudPalette, 0.22), cloudColor, 0.42)
    let skin = mix(baseSkin, largePigment, large.sac.mul(large.open.mul(0.9).add(0.1)))
    skin = mix(skin, smallPigment, small.sac.mul(small.open.mul(0.62).add(0.08)).mul(0.78))
// Dermal iridophores: a blue-green structural shimmer lives in the gaps and under the skin.
    const irido = spectralColor(facing.mul(3.6).add(metric.x.mul(0.7)).add(metric.y.mul(8)).add(time.mul(0.03))).mul(vec3(0.55, 0.9, 1.25))
    const iridoMask = large.sac.oneMinus().mul(0.38).add(small.sac.oneMinus().mul(0.16)).clamp(0, 1)
    const leucophore = large.rnd2.z.smoothstep(0.82, 0.95).mul(large.sac.oneMinus()).mul(near.mul(0.6).add(0.2))
    const rimDark = large.rim.mul(large.open).mul(0.55).add(small.rim.mul(small.open).mul(0.35))
    const surface = skin.mul(rimDark.oneMinus()).add(irido.mul(iridoMask).mul(0.055)).add(color('#fff6e4').mul(leucophore).mul(0.2))
    this.colorNode = surface
    this.metalness = 0
    this.roughnessNode = mix(float(0.38), float(0.26), near).add(rimDark.mul(0.08))
    this.clearcoat = 0.45
    this.clearcoatRoughness = 0.16
    this.iridescence = 0.3
    this.iridescenceIOR = 1.34
    this.iridescenceThicknessNode = facing.mul(380).add(190)
    this.sheen = 0.55
    this.sheenColor.set('#ff9c7a')
    this.sheenRoughness = 0.45
    const microWrinkle = mx_noise_float(vec3(metric.x.mul(80), metric.y.mul(95), time.mul(0.06))).mul(0.00012)
    const pore = mx_noise_float(vec3(metric.mul(240), 5.1)).mul(near).mul(0.00005)
    this.normalNode = detailNormal(geometryNormal, microWrinkle.add(pore).add(large.sac.mul(0.00018)).add(small.sac.mul(0.00008)), 0.85)
    this.aoNode = large.sac.mul(0.18).add(0.82)
    const papillaTip = glints(geometryNormal, 420).mul(near).mul(0.18)
    const wetRim = color('#bff7ff').mul(grazing.pow(2.7)).mul(0.07)
    const blush = largePigment.mul(large.sac).mul(large.open).mul(near.mul(0.12).add(0.02))
    this.emissiveNode = irido.mul(iridoMask).mul(grazing.pow(2.4)).mul(0.08).add(color('#ffe0c8').mul(papillaTip)).add(wetRim).add(blush.mul(0.08))
    this.envMapIntensity = 1.05
  }
}
