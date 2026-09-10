import {SimplexNoise} from 'three/addons/math/SimplexNoise.js'

import {moonfallCrater} from './config.ts'

const smooth = (from: number, to: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - from) / (to - from)))
  return t * t * (3 - 2 * t)
}

/** The same deterministic height field drives visible relief, floor queries and collision. */
export class CraterTerrain {
  private noise: SimplexNoise
  private secondary = [
    [-3.3, -1.6, 1.1],
    [2.2, 0.8, 0.72],
    [0.8, -3.8, 0.58],
    [-0.8, 3.3, 0.9],
    [4.6, -2.5, 0.52],
    [-4.5, 3.6, 0.65],
  ] as const

  constructor(readonly radius: number = moonfallCrater.radius, readonly depth: number = moonfallCrater.depth) {
    let seed = 0x61_73_74_65
    this.noise = new SimplexNoise({
      random: () => {
        seed = Math.imul(seed, 1_664_525) + 1_013_904_223 >>> 0
        return seed / 4_294_967_296
      },
    })
  }

  height(x: number, z: number) {
    const r = Math.hypot(x, z)
    const t = r / this.radius
    if (t >= 1) {
      return 0
    }
    const theta = Math.atan2(z, x)
    const fade = 1 - smooth(0.91, 1, t)
    const irregular = this.noise.noise(x * 0.47, z * 0.47)
    const warped = t + irregular * 0.021 * smooth(0.1, 0.5, t)
    const bowl = -this.depth * (1 - smooth(0.3, 0.83, warped))
    const rim = 0.3 * Math.exp(-(((warped - 0.835) / 0.066) ** 2))
    const ridges = (Math.sin(theta * 31 + irregular * 2.8) * 0.13 + Math.sin(theta * 57 - t * 14) * 0.055) * smooth(0.32, 0.65, t)
    const rubble = this.noise.noise(x * 1.8, z * 1.8) * 0.14 + this.noise.noise(x * 5, z * 5) * 0.04
    const peak = 0.65 * Math.exp(-((x + 0.8) ** 2 + (z - 0.4) ** 2) / 1.8)
    let secondary = 0
    for (const [cx, cz, radius] of this.secondary) {
      const distance = Math.hypot(x - cx, z - cz) / radius
      if (distance < 1.8) {
        secondary += -0.27 * Math.exp(-((distance / 0.68) ** 4)) + 0.12 * Math.exp(-(((distance - 1) / 0.2) ** 2))
      }
    }
    return (bowl + rim + ridges + rubble + peak + secondary) * fade
  }

  variation(x: number, z: number) {
    return this.noise.noise(x * 0.8, z * 0.8) * 0.6 + this.noise.noise(x * 7, z * 7) * 0.4
  }
}

export const craterTerrain = new CraterTerrain
