import type {Node} from 'three/webgpu'

import {color, float, max, mix, mx_fractal_noise_float, mx_noise_float, positionWorld, smoothstep, vec2, vec3} from 'three/tsl'
import {BackSide, MeshBasicNodeMaterial, Vector3} from 'three/webgpu'

export type SkyBoxOptions = {
  /** world position the sky directions are measured from */
  origin?: readonly [number, number, number]
  /** unit vector toward the sun in world coordinates */
  sunDirection?: readonly [number, number, number]
}

const defaultSun = new Vector3(-0.24, 0.72, 0.65)
defaultSun.normalize()
export const skySunDirection = [defaultSun.x, defaultSun.y, defaultSun.z] as const

const unit = (node: Node<'float'>) => node.mul(0.5).add(0.5)

/**
 * Procedural daytime sky dome seen through the Lobby’s glazed barrel vault.
 *
 * The dome shades a Rayleigh-like gradient from a crisp cerulean zenith down to a luminous, pale-blue horizon, with a warm golden
 * solar aureole and a bright sun disk. A drifting-looking layer of billowy cumulus clouds is projected onto the upper hemisphere,
 * lit with silver-gold rims on the sunward side and soft blue-gray undersides.
 *
 * Peak luminance outside the sun core stays below the bloom threshold of 1 so the sky reads as clear daylight rather than a wash
 * of postprocessing glow, while the sun disk itself rises gently above 1 to catch a soft solar halo.
 */
export default class SkyBoxMaterial extends MeshBasicNodeMaterial {
  constructor({origin = [0, 0, -12], sunDirection = skySunDirection}: SkyBoxOptions = {}) {
    super({
      side: BackSide,
      fog: false,
      toneMapped: false,
    })
    const length = Math.hypot(...sunDirection)
    if (!(length > 1e-6) || !sunDirection.every(Number.isFinite) || !origin.every(Number.isFinite)) {
      throw new RangeError('SkyBoxMaterial requires finite origin and non-zero sunDirection.')
    }
    const sun = vec3(sunDirection[0] / length, sunDirection[1] / length, sunDirection[2] / length)
    const dir = positionWorld.sub(vec3(...origin)).normalize().toVar('skyDir')
    const elevation = max(dir.y, 0.001).toVar('skyElevation')
    const sunCos = dir.dot(sun).clamp(-1, 1).toVar('skySunCos')
    // Clear light-blue sky gradient: deep sky blue at the zenith, airy powder blue toward the horizon.
    const zenithTint = color('#4e8fe0')
    const midSkyTint = color('#7cb8f6')
    const horizonTint = color('#cae6ff')
    const upperBlend = smoothstep(0.15, 0.88, elevation)
    const lowerBlend = smoothstep(0, 0.28, elevation)
    const baseSky = mix(horizonTint, mix(midSkyTint, zenithTint, upperBlend), lowerBlend).toVar('skyBase')
    // Atmospheric Mie forward scatter (warm golden-white glow around the sun) and crisp solar disk.
    const wideGlow = sunCos.max(0).pow(6).mul(0.24)
    const aureole = sunCos.max(0).pow(48).mul(0.42)
    const sunDisk = smoothstep(0.9962, 0.9993, sunCos).mul(2.1)
    // Planar cloud projection over the dome, Gently curved by elevation so clouds recede toward the horizon.
    const planeScale = float(1).div(elevation.add(0.22))
    const cloudUV = dir.xz.mul(planeScale).mul(1.35).toVar('skyCloudUV')
    const warp = vec2(
      mx_noise_float(vec3(cloudUV.mul(0.75), 2.1)),
      mx_noise_float(vec3(cloudUV.mul(0.75), 9.4)),
    ).mul(0.32)
    const p = cloudUV.add(warp)
    const billowBase = unit(mx_fractal_noise_float(vec3(p.mul(0.95), 4.7), 4))
    const detail = unit(mx_fractal_noise_float(vec3(p.mul(2.7), 13.2), 3))
    const densityRaw = billowBase.mul(0.74).add(detail.mul(0.26))
    // Keep plenty of open blue sky between cumulus banks, and fade clouds near the horizon.
    const horizonFade = smoothstep(0.05, 0.25, elevation)
    const cloudMask = smoothstep(0.51, 0.76, densityRaw).mul(horizonFade).toVar('skyCloudMask')
    // Approximate cloud self-shadowing by sampling density slightly toward the sun.
    const sunStep = sun.xz.mul(0.18)
    const towardSun = unit(mx_fractal_noise_float(vec3(p.add(sunStep).mul(0.95), 4.7), 3))
    const thickness = smoothstep(0.48, 0.82, densityRaw)
    const sunlit = smoothstep(-0.18, 0.22, towardSun.sub(densityRaw).negate()).mul(0.65).add(0.35)
    // Silver-lining forward scatter near the sun + sunlit cream tops + cool periwinkle cloud bases.
    const silverLining = sunCos.max(0).pow(10).mul(float(1).sub(thickness.mul(0.55))).mul(0.38)
    const cloudShadowTint = color('#9ab8dc')
    const cloudBrightTint = color('#fcfaf5')
    const cloudWarmTint = color('#fff1d4')
    const cloudBody = mix(cloudShadowTint, cloudBrightTint, sunlit.mul(float(1).sub(thickness.mul(0.32))))
    const cloudColor = cloudBody.add(cloudWarmTint.mul(silverLining))
    const clearSky = baseSky
      .add(color('#ffe9c4').mul(wideGlow))
      .add(color('#fff6e0').mul(aureole))
      .add(color('#fffdf4').mul(sunDisk))
    // Thick clouds occlude the sharp sun disk while keeping a warm diffused glow through their edges.
    const transmittedSun = clearSky.mul(float(1).sub(cloudMask.mul(0.88)))
    this.colorNode = transmittedSun.add(cloudColor.mul(cloudMask.mul(0.88)))
  }
}
