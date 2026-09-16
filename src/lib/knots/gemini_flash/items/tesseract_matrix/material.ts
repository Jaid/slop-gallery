import type {Texture} from 'three/webgpu'

import {KnotMaterialPremium} from '../../batch2Material.ts'
import knotData from './data.ts'

export default class TesseractMatrixMaterial extends KnotMaterialPremium {
  constructor(environment: Texture) {
    super('tesseract_matrix', environment)
    this.name = knotData.id
  }
}
