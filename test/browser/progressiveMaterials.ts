import type {Texture} from 'three/webgpu'

import {verifyMaterialCompilation} from '../../packages/three-async-materials/test/browser/materials.ts'
import KnotResources from '../../src/lib/knots/KnotResources.ts'
import {KnotMaterialPremium} from '../../src/lib/knots/sol/additionalBatchMaterial.ts'

/** Exercise the package's GPU regression with an actual expensive gallery material. */
export default async function verifyProgressiveMaterials() {
  const entry = {id: 'sol/captured_tempest'}
  const resources = new KnotResources([entry], new Map([[entry.id, CapturedTempestMaterial]]))
  try {
    const {geometry, material} = resources.items[0]
    return await verifyMaterialCompilation(geometry, material)
  } finally {
    resources.dispose()
  }
}
class CapturedTempestMaterial extends KnotMaterialPremium {
  constructor(environment: Texture) {
    super('captured_tempest', environment)
  }
}
