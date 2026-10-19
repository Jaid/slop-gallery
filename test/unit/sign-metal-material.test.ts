import {expect, test} from 'bun:test'

import BrushedMetalMaterial from '../../src/lib/materials/metal/BrushedMetalMaterial.ts'
import {SurroundingsNode} from '../../src/lib/materials/metal/Surroundings.ts'
import {signSupportMaterial} from '../../src/lib/materials/SignMetalMaterial.ts'

test('heavy uses the brushed metal mirroring Knottingham; fast an unlit material that still mirrors the room', () => {
  const heavy = signSupportMaterial(true)
  const fast = signSupportMaterial(false)
  try {
    expect(heavy).toBeInstanceOf(BrushedMetalMaterial)
    expect(heavy.type).toBe('MeshPhysicalNodeMaterial')
    expect(heavy.envNode).toBeInstanceOf(SurroundingsNode)
    expect((heavy.envNode as SurroundingsNode).room.walls.color).toBe('#5e121a')
    expect(heavy.normalNode).not.toBeNull()
    expect(fast.type).toBe('MeshBasicNodeMaterial')
    expect(fast.colorNode).not.toBeNull()
    expect(fast.normalNode).toBeNull()
    expect(fast.map).toBeNull()
  } finally {
    heavy.dispose()
    fast.dispose()
  }
})
