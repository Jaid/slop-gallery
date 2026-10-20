import {bumpMap, color, float, hash, max, mix, positionGeometry, smoothstep, vec2} from 'three/tsl'
import {MeshPhysicalNodeMaterial} from 'three/webgpu'

/** Small blue ceramic tesserae for the Lobby’s celestial tympanum; no textures, emission or extra reflection pass. */
export default class CelestialMosaicMaterial extends MeshPhysicalNodeMaterial {
  constructor(heavy: boolean) {
    super({
      color: '#294f65',
      metalness: 0.08,
      roughness: 0.48,
      clearcoat: 0.16,
      clearcoatRoughness: 0.28,
    })
    this.name = 'Lapis celestial mosaic'
    if (!heavy) {
      return
    }
    const tile = positionGeometry.xy.div(0.11)
    const cell = tile.floor()
    const variation = hash(cell.dot(vec2(127.1, 311.7))).sub(0.5)
    const edge = float(0.5).sub(tile.fract().sub(0.5).abs())
    const footprint = max(tile.fwidth(), vec2(0.0001))
    const inset = smoothstep(footprint.negate(), footprint, edge.sub(0.013))
    const seam = inset.x.mul(inset.y)
    // Fade the mortar and per-tile tone before tesserae become subpixel; the distant field stays calm.
    const detail = float(1).sub(smoothstep(0.3, 1, max(footprint.x, footprint.y)))
    const blue = color('#294f65').mul(variation.mul(0.14).mul(detail).add(1))
    this.colorNode = mix(blue, color('#61717a'), float(1).sub(seam).mul(detail).mul(0.42))
    this.normalNode = bumpMap(seam.mul(detail), float(0.0008))
    this.roughnessNode = float(0.48).add(variation.mul(0.08).mul(detail))
  }
}
