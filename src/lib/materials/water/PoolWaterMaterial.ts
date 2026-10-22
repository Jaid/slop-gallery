import type {Node} from 'three/webgpu'

import {atan, attribute, cameraFar, cameraNear, cameraProjectionMatrix, cameraWorldMatrix, color, exp, float, floor, fwidth, length, max, mix, mx_noise_float, mx_worley_noise_float, perspectiveDepthToViewZ, positionGeometry, positionView, positionViewDirection, positionWorld, screenUV, smoothstep, time, transformNormalToView, vec2, vec3, vec4, viewportDepthTexture, viewportOpaqueMipTexture, viewportSafeUV} from 'three/tsl'
import {MeshPhysicalNodeMaterial} from 'three/webgpu'

import fountain, {jetAngle, ribbonSheet, sheetLanding, spoutAngle} from '../../gallery/fountain/config.ts'
import {lobbyEnvironment} from './LobbyEnvironment.ts'
import {waterFresnel, waterIor, waterTransmittance} from './water.ts'

type Float = Node<'float'>
type Vec2 = Node<'vec2'>

/** Finite-difference step for the ripple gradient, in meters. */
const gradientStep = 0.003
/** Beyond this path through the water in meters, the refracted view stops drifting further. */
const maximumPath = 1.5
/** Exaggerates the refraction slightly, so the shallow basin’s ripples visibly bend its floor. */
const refractionGain = 1.6

/** A family of equal splash sources around the axis: `count` of them at `radius`, the first at `offset` radians. */
type SplashRing = {
  amplitude: number
  count: number
  offset: number
  radius: number
}
const splashSources: Array<SplashRing> = [
  {
    // The ribbons from the tazza’s spouts.
    radius: sheetLanding(ribbonSheet),
    count: fountain.spouts,
    offset: spoutAngle(0),
    amplitude: 0.0022,
  },
  {
    // The arcing jets from the coping.
    radius: fountain.arc.to[0],
    count: fountain.lobes,
    offset: jetAngle(0),
    amplitude: 0.0014,
  },
]
/** Distance from `p` to the nearest of the sources of `ring`, folding the plane into one sector so it costs the same for any count. */
function nearestSource(p: Vec2, angle: Float, ring: SplashRing) {
  const sector = 2 * Math.PI / ring.count
  const shifted = angle.sub(ring.offset).add(sector / 2)
  const local = shifted.sub(floor(shifted.div(sector)).mul(sector)).sub(sector / 2)
  const radius = length(p)
  return length(vec2(local.cos(), local.sin()).mul(radius).sub(vec2(ring.radius, 0)))
}

/**
 * The standing water of the fountain’s three pools.
 *
 * Its surface is a height field in meters: a slow cross swell, fine wind-like ruffles, concentric rings running outward from where the cup’s veil and
 * the crown jet’s droplets land (`splashRing`, its distance from the axis, or −1) and, on the basin (`splashPoints` 1), ripples from every ribbon and
 * arcing jet, each churning a little foam. Details finer than a pixel fade out instead of sparkling.
 *
 * In heavy mode, the water refracts what lies under it through those ripples, darkening and tinting it by Beer–Lambert absorption along the actual path
 * the depth buffer gives, plus the way down the light took to get there, so the shallow cup stays crystal clear while the basin turns aqua toward its
 * depths and at glancing angles. The surface itself only reflects, weighted by Fresnel. Fast mode skips the backdrop and blends a tinted,
 * Fresnel-weighted surface over the stone instead.
 */
export default class PoolWaterMaterial extends MeshPhysicalNodeMaterial {
  constructor(heavy = true) {
    super({
      // The body only reflects; whatever is seen through the water comes from the refracted backdrop or from blending.
      color: '#000000',
      metalness: 0,
      roughness: 0.03,
      ior: waterIor,
      specularIntensity: 1,
      clearcoat: 0,
      transparent: true,
      opacity: 1,
      depthWrite: true,
      // The room’s own reflection, bright where the room is bright; see LobbyEnvironment.
      envMap: lobbyEnvironment,
      envMapIntensity: heavy ? 1 : 0.8,
    })
    this.name = heavy ? 'fountain-pool-water' : 'fountain-pool-water-fast'
    const p = positionGeometry.xz
    const footprint = max(fwidth(p.x), fwidth(p.y)).toVar('poolFootprint')
    // Waves shorter than about four pixels fade to flat before they could shimmer.
    const visible = (wavelength: number) => float(1).sub(smoothstep(wavelength * 0.1, wavelength * 0.3, footprint))
    const ring = attribute<'float'>('splashRing', 'float')
    const points = attribute<'float'>('splashPoints', 'float')
    const height = (q: Vec2) => {
      const angle = atan(q.y, q.x)
      // Slopes of a few percent: the stirred surface of a fountain, not a calm pond.
      const swell = q.x.mul(5.3).add(q.y.mul(3.1)).sub(time.mul(1.1)).sin().mul(0.0028)
        .add(q.x.mul(-3.7).add(q.y.mul(6.4)).sub(time.mul(1.45)).sin().mul(0.0022))
      const ruffle = mx_noise_float(vec3(q.mul(7), time.mul(0.45))).mul(0.0022).mul(visible(0.14))
        .add(mx_noise_float(vec3(q.mul(19).add(3.1), time.mul(0.9))).mul(0.0007).mul(visible(0.05)))
      // Rings from the cup’s veil or the falling droplets, fading as they spread.
      const fromRing = length(q).sub(ring).abs()
      const rings = fromRing.mul(62).sub(time.mul(8.5)).sin().mul(exp(fromRing.mul(-6))).mul(0.0018).mul(ring.greaterThanEqual(0).select(float(1), float(0))).mul(visible(0.1))
      let splashes: Float = float(0)
      for (const source of splashSources) {
        const distance = nearestSource(q, angle, source)
        // A little noise in the phase keeps the rings from looking machined.
        const wobble = mx_noise_float(vec3(q.mul(11), time.mul(1.3))).mul(0.8)
        splashes = splashes.add(distance.mul(75).sub(time.mul(11)).add(wobble).sin().mul(exp(distance.mul(-7.5))).mul(source.amplitude))
      }
      return swell.add(ruffle).add(rings).add(splashes.mul(points).mul(visible(0.08)))
    }
    const center = height(p)
    const slope = vec2(
      height(p.add(vec2(gradientStep, 0))).sub(center),
      height(p.add(vec2(0, gradientStep))).sub(center),
    ).div(gradientStep)
    // The pools lie flat in the fountain’s local space, facing up.
    const surfaceNormal = transformNormalToView(vec3(slope.x.negate(), 1, slope.y.negate()).normalize()).normalize()
    const flatNormal = transformNormalToView(vec3(0, 1, 0)).normalize()
    this.normalNode = surfaceNormal
    // Churned water where the ribbons and jets land and the veil meets the tazza: white, matte and opaque, broken up by slowly boiling noise.
    const angle = atan(p.y, p.x)
    let churn: Float = exp(length(p).sub(ring).abs().mul(-30)).mul(ring.greaterThanEqual(0.05).select(float(0.8), float(0)))
    for (const [index, source] of splashSources.entries()) {
      // The ribbons land harder and wider than the slender jets.
      churn = churn.max(exp(nearestSource(p, angle, source).mul(index === 0 ? -14 : -22)).mul(points))
    }
    const boil = mx_noise_float(vec3(p.mul(26), time.mul(2.1))).mul(0.5).add(0.5)
      .mul(mx_noise_float(vec3(p.mul(10).add(5.7), time.mul(0.9))).mul(0.4).add(0.8))
    // A churned core right where the water lands, broken into drifting patches and bubbles around it.
    const foam = churn.pow(2).mul(0.7).add(churn.mul(boil).smoothstep(0.12, 0.6).mul(0.8)).clamp(0, 0.95).toVar('poolFoam')
    // Foam is a lace of bubbles: bright films with darker, clearer holes between them.
    const bubbles = mx_worley_noise_float(vec3(p.mul(70), time.mul(1.5)))
    const lace = bubbles.smoothstep(0.15, 0.6).mul(0.45).add(0.55).mul(visible(0.03)).add(float(0.8).mul(float(1).sub(visible(0.03))))
    this.colorNode = vec3(foam.mul(lace))
    this.roughnessNode = mix(float(0.03), float(0.5), foam)
    const cosine = surfaceNormal.dot(positionViewDirection).abs()
    const fresnel = waterFresnel(cosine)
    if (heavy) {
      // Where the view ray meets whatever lies beyond the surface, and how far it travels through the water to get there.
      const backdropViewZ = perspectiveDepthToViewZ(viewportDepthTexture(screenUV), cameraNear, cameraFar)
      const backdrop = positionView.mul(backdropViewZ.div(positionView.z))
      const path = length(backdrop.sub(positionView)).clamp(0, maximumPath)
      // The light that lit that point came down through the water first, about straight from above, as deep as the point lies below the surface.
      const depth = positionWorld.y.sub(cameraWorldMatrix.mul(vec4(backdrop, 1)).y).clamp(0, maximumPath)
      // A tilted facet bends the ray by about (n − 1) times its tilt, and the ray keeps drifting along its whole path below.
      const drift = surfaceNormal.xy.sub(flatNormal.xy).mul((waterIor - 1) * refractionGain).mul(path)
      const clip = cameraProjectionMatrix.mul(vec4(backdrop.xy.add(drift), backdrop.z, 1))
      const uv = clip.xy.div(clip.w).mul(vec2(0.5, -0.5)).add(0.5).clamp(0, 1)
      // Anything above the water, like a visitor’s own hand, must not be refracted into it.
      const transmitted = (viewportOpaqueMipTexture(viewportSafeUV(uv)) as Node<'vec4'>).rgb
      this.emissiveNode = transmitted.mul(waterTransmittance(path.add(depth))).mul(float(1).sub(fresnel)).mul(float(1).sub(foam))
    } else {
      // Without the backdrop, the water is a tinted veil over its stone: clearer head-on, more reflective toward the horizon.
      this.colorNode = mix(color('#5f9f97'), color('#f2f7f5'), foam)
      this.opacityNode = mix(float(0.42), float(0.9), fresnel.max(foam))
    }
  }
}
