import {describe, expect, test} from 'bun:test'

import StudioEnvironment from 'knot-materials/StudioEnvironment.ts'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import BrushedMetalMaterial, {steelReflectance} from '../../src/lib/materials/BrushedMetalMaterial.ts'
import metal from '../../src/lib/materials/metal.ts'

const clients = [
  'src/components/FountainBenches/index.tsx',
  'src/components/OculusRailings/index.tsx',
  'src/components/KnotLabels/index.tsx',
]
describe('shared satin steel', () => {
  test('is a fully metallic, opaque PBR material with filtered procedural brushing', () => {
    const material = new BrushedMetalMaterial
    try {
      expect(material).toBeInstanceOf(MeshStandardNodeMaterial)
      expect(material.metalness).toBe(1)
      expect(material.roughness).toBeGreaterThan(0.2)
      expect(material.roughness).toBeLessThan(0.35)
      expect(material.colorNode).not.toBeNull()
      expect(material.roughnessNode).not.toBeNull()
      expect(material.normalNode).not.toBeNull()
      expect(material.emissiveNode).toBeNull()
      expect(material.emissive.getHex()).toBe(0)
      expect(material.transparent).toBe(false)
      expect(material.opacity).toBe(1)
      expect(material.map).toBeNull()
      expect(material.normalMap).toBeNull()
      expect(material.envMap).toBeNull()
    } finally {
      material.dispose()
    }
  })
  test('has a neutral, slightly cool conductor reflectance', () => {
    const [red, green, blue] = steelReflectance
    expect(red).toBeGreaterThan(0.5)
    expect(blue).toBeLessThan(0.7)
    expect(green).toBeGreaterThanOrEqual(red)
    expect(blue).toBeGreaterThanOrEqual(green)
    expect(blue - red).toBeLessThan(0.1)
  })
  test('shares one static HDR environment, without a reflector or additional scene pass', async () => {
    expect(metal).toBeInstanceOf(BrushedMetalMaterial)
    expect(metal.envMap).toBeInstanceOf(StudioEnvironment)
    expect(metal.envMapIntensity).toBeGreaterThan(0)
    expect(metal.envMapIntensity).toBeLessThanOrEqual(1)
    const again = await import('../../src/lib/materials/metal.ts')
    expect(again.default).toBe(metal)
  })
  test('the environment is borrowed, not disposed with an individual material', () => {
    const environment = new StudioEnvironment
    const material = new BrushedMetalMaterial({
      environment,
      environmentIntensity: 0.6,
    })
    let disposed = 0
    environment.addEventListener('dispose', () => disposed++)
    try {
      expect(material.envMap).toBe(environment)
      expect(material.envMapIntensity).toBe(0.6)
      material.dispose()
      expect(disposed).toBe(0)
    } finally {
      environment.dispose()
    }
    expect(disposed).toBe(1)
  })
  test('all three pointed-at elements borrow the same material', async () => {
    const sources = await Promise.all(clients.map(file => Bun.file(file).text()))
    for (const [index, source] of sources.entries()) {
      expect(source, clients[index]).toContain("import metal from '#src/lib/materials/metal.ts'")
      expect(source).not.toContain('metal.dispose(')
      expect(source).not.toContain('useDisposable(metal)')
    }
    const signs = sources[2]
    // Heavy → fast → heavy switches must never dispose the shared material. Only the original flat fallback is locally owned.
    expect(signs).toContain("useDisposable(useMemo(() => new MeshBasicNodeMaterial({color: '#9ca6ad'}), []))")
    expect(signs).toContain('const supportMaterial = isHeavy ? metal : flatSupportMaterial')
    expect(signs).toContain("<primitive attach='material' object={supportMaterial} />")
    expect(signs).toContain('geometry={resources.supports.geometry} material={supportMaterial} visible={false}')
  })
})
