declare module 'virtual:knot-exhibition-materials' {
  import type {KnotMaterialConstructor} from 'knot-materials/types.ts'

  const materials: ReadonlyMap<string, KnotMaterialConstructor>
  export default materials
}
