declare module 'virtual:knot-exhibition-materials' {
  import type {KnotMaterialConstructor} from '#src/lib/knots/types.ts'

  const materials: ReadonlyArray<KnotMaterialConstructor>
  export default materials
}
