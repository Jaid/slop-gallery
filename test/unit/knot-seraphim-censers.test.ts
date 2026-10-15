import {expect, test} from 'bun:test'

import SeraphimCensers from 'knot-materials/entries/seraphim_censers/Material.ts'
import KnotMaterial from 'knot-materials/lib/KnotMaterial.ts'
import {Texture} from 'three/webgpu'

test('Seraphim Censers gives its cage a recessed core', () => {
  const environment = new Texture
  const material = new SeraphimCensers(environment)
  try {
    expect(material).toBeInstanceOf(KnotMaterial)
    expect(material.coreMaterial?.isMeshPhysicalNodeMaterial).toBe(true)
  } finally {
    material.dispose()
    environment.dispose()
  }
})
