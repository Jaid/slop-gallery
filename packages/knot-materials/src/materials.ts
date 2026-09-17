import type {KnotEntry, KnotMaterialModule} from './types.ts'

// Each shader is its own chunk. Metadata never evaluates omitted or archived shaders.
const materials = import.meta.glob<KnotMaterialModule>('./entries/*/Material.ts')

export default async function loadKnotMaterial(item: Pick<KnotEntry, 'id'>) {
  const key = `./entries/${item.id}/Material.ts`
  if (!Object.hasOwn(materials, key)) {
    throw new Error(`Unknown Knot material: ${item.id}`)
  }
  const module = await materials[key]()
  return module.default
}
