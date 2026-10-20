import type {Node} from 'three/webgpu'

import {cameraPosition, color, cross, dot, float, mix, mx_fractal_noise_float, normalize, positionWorld, pow, smoothstep, vec3} from 'three/tsl'

/**
 * Color of a clear late-morning sky in the direction from the camera through `point`, with a sun and a few fair-weather clouds.
 *
 * Entirely procedural: a gradient from deep blue overhead to a warm haze at the horizon, a soft solar disc with a wider glare and
 * a slow fractal cloud field gathered into a band. The sun’s core is the only part meant to reach the gallery’s bloom.
 */
export function daylightSky(point: Node<'vec3'> = positionWorld): Node<'vec3'> {
  const direction = normalize(point.sub(cameraPosition))
  const up = vec3(0, 1, 0)
  const elevation = dot(direction, up).clamp(-1, 1)
  const sky = mix(
    color('#d7c19a'),
    mix(color('#4e93d4'), color('#1d4f92'), smoothstep(0.02, 0.7, elevation)),
    smoothstep(-0.08, 0.22, elevation),
  )
  // High in the south, so it shows through the crown of the vault from the Lobby floor.
  const sunDirection = normalize(vec3(0.18, 0.72, -0.67))
  const alignment = dot(direction, sunDirection).clamp(-1, 1)
  const disc = smoothstep(0.9994, 0.99985, alignment)
  const glare = pow(alignment.max(0), float(64)).mul(0.35)
  const sun = color('#fff6d8').mul(disc.mul(1.6).add(glare))
  const side = normalize(cross(up, sunDirection))
  const ahead = cross(side, up)
  const cloudPoint = vec3(dot(direction, side).mul(2.4), elevation.mul(3.2), dot(direction, ahead).mul(2.4))
  const cloud = mx_fractal_noise_float(cloudPoint, 4).mul(0.5).add(0.5)
  const band = smoothstep(0.05, 0.45, elevation).mul(smoothstep(0.8, 0.35, elevation))
  const cover = smoothstep(0.52, 0.72, cloud).mul(band).mul(0.65)
  return mix(sky.add(sun), mix(color('#c5d4e4'), color('#f7fbff'), cover), cover)
}
