import {expect, test} from 'bun:test'

import {signSupportMaterial} from '../../src/lib/materials/SignMetalMaterial.ts'

test('quality uses brushed physical metal; performance has only a flat color', () => {
  const quality = signSupportMaterial(true)
  const performance = signSupportMaterial(false)
  try {
    expect(quality.type).toBe('MeshPhysicalNodeMaterial')
    expect(quality.colorNode).not.toBeNull()
    expect(quality.normalNode).not.toBeNull()
    expect(performance.type).toBe('MeshBasicNodeMaterial')
    expect(performance.color.getHexString()).toBe('9ca6ad')
    expect(performance.colorNode).toBeNull()
    expect(performance.normalNode).toBeNull()
    expect(performance.map).toBeNull()
  } finally {
    quality.dispose()
    performance.dispose()
  }
})
