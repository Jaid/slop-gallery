import type {Texture} from 'three/webgpu'

import {verifyMaterialCompilation} from '../../packages/three-async-materials/test/browser/materials.ts'
import KnotResources from '../../src/lib/knots/KnotResources.ts'
import {KnotMaterialPremium} from '../../src/lib/knots/sol/additionalBatchMaterial.ts'
import StudioEnvironment from '../../src/lib/materials/StudioEnvironment.ts'

/** Exercise the package's GPU regression with an actual expensive gallery material. */
export default async function verifyProgressiveMaterials() {
  class CapturedTempestMaterial extends KnotMaterialPremium {
    constructor(environment: Texture) {
      super('captured_tempest', environment)
    }
  }
  const entry = {id: 'sol/captured_tempest'}
  const resources = new KnotResources([entry])
  const environment = new StudioEnvironment
  const material = new CapturedTempestMaterial(environment)
  try {
    return await verifyMaterialCompilation(resources.items[0].geometry, material)
  } finally {
    material.dispose()
    environment.dispose()
    resources.dispose()
  }
}
