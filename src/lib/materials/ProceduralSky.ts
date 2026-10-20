import type {Node} from 'three/webgpu'

import {color, float, max, mix, mx_fractal_noise_float, normalWorldGeometry, pow, smoothstep, time, vec2, vec3} from 'three/tsl'

export type ProceduralSkyOptions = {
  /** share of the sky covered by clouds, 0–1 */
  cloudCover?: number
  /** unit vector toward the sun */
  sunDirection: Vector
}

type Vector = readonly [number, number, number]

/** Angular radius of the sun’s disc, a little larger than the real 0.27° so it reads at game resolutions. */
const sunRadius = 0.6 * Math.PI / 180
/** Linear radiance of the disc itself; far above the bloom threshold, so it flares like the sun. */
const sunRadiance = 40
/** Height of the cloud deck in the projection, against which directions are traced; larger is flatter. */
const cloudHeight = 0.35
/** Cloud deck units per second, a slow drift toward the north-east. */
const wind = [0.0016, -0.0011] as const

/**
 * A clear, light-blue daytime sky with a sun and fair-weather cumulus, entirely procedural.
 *
 * Returns a linear color for a world direction: a deep azure zenith that pales toward a hazy horizon, a soft glow around the
 * sun with a bright disc in it, and drifting clouds traced on a flat deck overhead. The clouds are lit from the sun’s side,
 * gray underneath and fade into the haze toward the horizon, where the deck’s projection would get too fine to draw.
 * Everything but the sun stays below the gallery’s bloom threshold of 1.
 */
export function proceduralSky({cloudCover = 0.42, sunDirection}: ProceduralSkyOptions, direction: Node<'vec3'> = normalWorldGeometry.normalize()) {
  if (!(cloudCover >= 0 && cloudCover <= 1)) {
    throw new RangeError('Cloud cover has to be between 0 and 1.')
  }
  const length = Math.hypot(...sunDirection)
  if (!(length > 0)) {
    throw new RangeError('The sun needs a direction.')
  }
  const sun = vec3(...sunDirection.map(value => value / length) as [number, number, number])
  const up = direction.y
  const above = up.max(0)
  // Azure overhead, paling to a hazy, almost white horizon; below it a warm, pale ground haze.
  const zenith = color('#3f86d4')
  const horizon = color('#cfe3f2')
  const ground = color('#c9c4b5')
  const gradient = mix(horizon, zenith, pow(above, float(0.55)))
  let sky: Node<'vec3'> = mix(gradient, ground, smoothstep(0, -0.08, up)).mul(0.82)
  const cosine = direction.dot(sun).clamp(-1, 1)
  // A wide, faint aureole and a tighter, brighter one, both warm.
  const aureole = pow(cosine.max(0), float(6)).mul(0.16).add(pow(cosine.max(0), float(160)).mul(0.5))
  sky = sky.add(color('#fff1d2').mul(aureole))
  // Clouds: a flat deck overhead, traced along the view direction and drifting with the wind.
  const deck = vec2(direction.x, direction.z).div(up.add(cloudHeight * 0.3).max(0.02)).mul(cloudHeight).add(vec2(...wind).mul(time))
  const shape = mx_fractal_noise_float(vec3(deck.mul(2.2), 3.7), 5, 2, 0.5).mul(0.5).add(0.5)
  const detail = mx_fractal_noise_float(vec3(deck.mul(9), 11.3), 3, 2, 0.5).mul(0.5).add(0.5)
  const threshold = float(1 - cloudCover * 0.75)
  const density = smoothstep(threshold.sub(0.12), threshold.add(0.18), shape.add(detail.sub(0.5).mul(0.25)))
  // Toward the horizon the deck is seen ever more edge-on: its clouds thin out into the haze instead of crawling.
  const visible = smoothstep(0.04, 0.3, up)
  const coverage = density.mul(visible)
  // Thick cores are gray underneath, thin edges glow; the sunward side of the sky lights them warmer.
  const shade = mix(color('#f6f7f8'), color('#a6aebb'), smoothstep(0.35, 1, density).mul(0.75))
  const lit = shade.add(color('#fff3dc').mul(pow(cosine.max(0), float(4)).mul(0.25))).mul(0.9)
  sky = mix(sky, lit, coverage.mul(0.92))
  // The sun’s disc, softened by a pixel-scale rim and veiled where a cloud passes in front of it.
  const disc = smoothstep(Math.cos(sunRadius * 1.15), Math.cos(sunRadius * 0.85), cosine)
  sky = sky.add(color('#fff6e4').mul(disc.mul(float(1).sub(coverage.mul(0.85))).mul(sunRadiance)))
  return max(sky, vec3(0))
}

export default proceduralSky
