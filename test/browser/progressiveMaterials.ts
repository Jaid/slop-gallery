import CapturedTempestMaterial from 'knot-materials/entries/captured_tempest/Material.ts'
import KnotResources from 'knot-materials/KnotResources.ts'
import StudioEnvironment from 'knot-materials/StudioEnvironment.ts'

import {verifyMaterialCompilation} from '../../packages/three-async-materials/test/browser/materials.ts'

/** Exercise the package's GPU regression with an actual expensive gallery material. */
export default async function verifyProgressiveMaterials() {
  const entry = {id: 'captured_tempest'}
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
