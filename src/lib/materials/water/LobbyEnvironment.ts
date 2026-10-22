import {DataTexture, EquirectangularReflectionMapping, FloatType, LinearFilter, RepeatWrapping, RGBAFormat} from 'three/webgpu'

type Rgb = readonly [number, number, number]

const degrees = Math.PI / 180
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
/** linear radiance of the room’s surfaces as seen from the fountain */
const palette = {
  floor: [0.5, 0.42, 0.31],
  wall: [0.74, 0.67, 0.55],
  pilaster: [0.82, 0.75, 0.62],
  doorway: [0.16, 0.13, 0.11],
  vault: [0.66, 0.58, 0.45],
  gilt: [0.95, 0.68, 0.3],
  sky: [0.95, 1.25, 1.7],
  bar: [0.32, 0.27, 0.2],
  candle: [5, 3.6, 2],
} as const satisfies Record<string, Rgb>

/**
 * Linear radiance of a direction from the middle of the Lobby, z along the room’s length: travertine floor and walls with pilasters and dark doorways,
 * a cream vault with gilt ribs, sky through the glazed crown and the warm glow of the chandeliers. An approximation for reflections, not a capture.
 */
export function lobbyRadiance(x: number, y: number, z: number): Rgb {
  const elevation = Math.asin(Math.max(-1, Math.min(1, y)))
  const azimuth = Math.atan2(z, x)
  if (elevation < -8 * degrees) {
    // Tile joints every few degrees of azimuth, fading toward the nadir.
    const joint = smoothstep(0.96, 1, Math.abs(Math.cos(azimuth * 12))) * smoothstep(-80 * degrees, -20 * degrees, elevation) * 0.25
    return mix(palette.floor, palette.bar, joint)
  }
  if (elevation < 32 * degrees) {
    const wall = mix(palette.floor, palette.wall, smoothstep(-8 * degrees, -2 * degrees, elevation))
    const pilaster = mix(wall, palette.pilaster, smoothstep(0.85, 0.95, Math.abs(Math.cos(azimuth * 6))) * 0.8)
    // Arched doorways low on the walls, mostly toward the room’s sides.
    const doorway = smoothstep(0.9, 0.97, Math.abs(Math.cos(azimuth * 2 + 0.6))) * (1 - smoothstep(10 * degrees, 16 * degrees, elevation)) * smoothstep(-6 * degrees, -2 * degrees, elevation)
    return mix(pilaster, palette.doorway, doorway * 0.85)
  }
  // The vault runs along z: the glazed crown band is where a direction leans less than 55° away from straight up, across the room.
  const across = Math.atan2(Math.abs(x), y)
  const ribs = smoothstep(0.93, 0.99, Math.abs(Math.cos(Math.atan2(z, Math.hypot(x, y)) * 9)))
  const vault = mix(mix(palette.vault, palette.gilt, ribs * 0.6), palette.wall, 1 - smoothstep(32 * degrees, 45 * degrees, elevation))
  const glazed = 1 - smoothstep(48 * degrees, 56 * degrees, across)
  const bars = Math.max(smoothstep(0.9, 0.97, Math.abs(Math.cos(across * 14))), ribs) * 0.7
  let radiance = mix(vault, mix(palette.sky, palette.bar, bars), glazed)
  // Three chandeliers along the room’s axis: a soft halo around a bright ring of candles.
  for (const along of [-0.75, 0, 0.75]) {
    const distance = Math.hypot(x, z - along * Math.cos(elevation), y - Math.sin(55 * degrees))
    radiance = mix(radiance, palette.candle, Math.exp(-((distance / 0.14) ** 2)) * 0.8)
  }
  return radiance
}

/**
 * A static, procedural stand-in for the Lobby’s surroundings, for the fountain’s water to mirror.
 *
 * The gallery’s scene environment is a dim, olive gradient tuned as a soft fill, which water, a near-perfect mirror at grazing angles, would show as
 * dark smoke over the bright room. This one is bright where the room is bright, so veils and streams get the luminous rims of real water. Like the
 * shared metal’s studio, it needs no extra scene render and does not follow the lighting presets.
 */
export default class LobbyEnvironment extends DataTexture {
  constructor() {
    const width = 512
    const height = 256
    const pixels = new Float32Array(width * height * 4)
    for (let row = 0; row < height; row++) {
      // Equirectangular rows run from the nadir up to the zenith.
      const elevation = ((row + 0.5) / height - 0.5) * Math.PI
      for (let column = 0; column < width; column++) {
        // Matches three’s equirectangular lookup, u = atan2(z, x) / 2π + ½.
        const azimuth = ((column + 0.5) / width - 0.5) * 2 * Math.PI
        const [r, g, b] = lobbyRadiance(Math.cos(elevation) * Math.cos(azimuth), Math.sin(elevation), Math.cos(elevation) * Math.sin(azimuth))
        pixels.set([r, g, b, 1], (row * width + column) * 4)
      }
    }
    super(pixels, width, height, RGBAFormat, FloatType)
    this.name = 'Procedural Lobby surroundings'
    this.mapping = EquirectangularReflectionMapping
    this.wrapS = RepeatWrapping
    this.minFilter = LinearFilter
    this.magFilter = LinearFilter
    this.needsUpdate = true
  }
}

/** The one Lobby environment, shared by the fountain’s water materials for the page’s lifetime; borrowed, never disposed. */
export const lobbyEnvironment = new LobbyEnvironment
