import {expect, test} from 'bun:test'

import {signSupportMaterial} from '../../src/lib/materials/SignMetalMaterial.ts'

test('heavy uses brushed physical metal; fast has only a flat color', () => {
  const heavy = signSupportMaterial(true)
  const fast = signSupportMaterial(false)
  try {
    expect(heavy.type).toBe('MeshPhysicalNodeMaterial')
    expect(heavy.colorNode).not.toBeNull()
    expect(heavy.normalNode).not.toBeNull()
    expect(fast.type).toBe('MeshBasicNodeMaterial')
    expect(fast.color.getHexString()).toBe('9ca6ad')
    expect(fast.colorNode).toBeNull()
    expect(fast.normalNode).toBeNull()
    expect(fast.map).toBeNull()
  } finally {
    heavy.dispose()
    fast.dispose()
  }
})
