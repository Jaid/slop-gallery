import type {Texture} from 'three/webgpu'

/** The material options of the pale timber framing the Lodge’s tunnel and the corridor’s portals. */
export default function lodgeTimber(grain: Texture) {
  return {
    map: grain,
    bumpMap: grain,
    bumpScale: 0.012,
    color: '#e9c99f',
    roughness: 0.72,
    envMapIntensity: 0.2,
  }
}
