import type {Texture} from 'three/webgpu'

import {KnotMaterialPremium} from '../../batch2Material.ts'
import knotData from './data.ts'

export default class CelestialAstrolabeMaterial extends KnotMaterialPremium {
  constructor(environment: Texture) {
    super('celestial_astrolabe', environment)
    this.name = knotData.id
  }
}
