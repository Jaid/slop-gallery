import GrainedWoodMaterial from './GrainedWoodMaterial.ts'

/**
 * Satin-oiled black walnut joinery.
 *
 * Geometry supplies the grain through the `woodGrain` attribute, see {@link GrainedWoodMaterial}.
 */
export default class WalnutMaterial extends GrainedWoodMaterial {
  constructor() {
    super({
      heartwood: ['#2a1910', '#4f3220'],
      latewood: '#1b0f09',
    })
  }
}
