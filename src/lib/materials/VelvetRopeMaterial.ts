import {color, mix, mx_noise_float, normalView, positionLocal, positionViewDirection} from 'three/tsl'
import {MeshPhysicalNodeMaterial} from 'three/webgpu'

/**
 * The red velvet sleeve of a museum barrier rope.
 *
 * Velvet has almost no mirror highlight; its fibers scatter a soft, brighter red at grazing angles instead, so the rope glows along its silhouette and stays deep crimson where it faces the viewer; the pile itself also looks lighter where it is seen from the side. Slight patches where the pile was crushed by hands read a little lighter.
 */
export default class VelvetRopeMaterial extends MeshPhysicalNodeMaterial {
  constructor() {
    super({
      roughness: 0.9,
      metalness: 0,
      // The pile scatters light instead of mirroring it; a plain specular lobe would make the rope read as rubber.
      specularIntensity: 0,
      envMapIntensity: 0.25,
      sheen: 1,
      sheenRoughness: 0.5,
    })
    this.name = 'Red velvet rope'
    const crushed = mx_noise_float(positionLocal.mul(3.1)).mul(0.5).add(0.5).smoothstep(0.45, 0.85)
    // Fibers seen from the side catch more light than those pointing at the viewer, which look into the dark pile.
    const grazing = normalView.dot(positionViewDirection).abs().oneMinus().pow(2)
    this.colorNode = mix(mix(color('#5c0410'), color('#8a0e1d'), crushed), color('#c42232'), grazing.mul(0.75))
    this.sheenNode = mix(color('#ff2a3c'), color('#ff6a72'), crushed)
  }
}
