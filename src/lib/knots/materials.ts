import type {KnotEntry, KnotMaterialModule} from './types.ts'

// Each shader is its own chunk. Browsing metadata never evaluates archived or omitted shaders.
const materials = import.meta.glob<KnotMaterialModule>('./*/items/*/material.ts')

export async function loadKnotMaterial(item: KnotEntry) {
  const load = materials['./' + item.model + '/items/' + item.sourceId + '/material.ts']
  if (!load) throw new Error('Unknown Knot material: ' + item.id)
  return (await load()).default
}
