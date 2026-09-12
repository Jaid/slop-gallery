declare module 'virtual:knot-exhibition-materials' {
  import type {KnotMaterialConstructor} from '#src/lib/knots/types.ts'

  const materials: ReadonlyMap<string, KnotMaterialConstructor>
  export default materials
}
