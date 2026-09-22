declare module 'virtual:knot-exhibition-materials' {
  import type {KnotMaterialConstructor} from 'knot-materials/types.ts'

  const materials: ReadonlyMap<string, KnotMaterialConstructor>
  export default materials
}
declare module 'voice-sample' {
  const url: string
  export default url
}
declare module 'voice-sample/timings' {
  const timings: ReadonlyArray<{
    char: string
    end: number
    start: number
  }>
  export default timings
}
declare module 'voice-sample:*/timings' {
  const timings: ReadonlyArray<{
    char: string
    end: number
    start: number
  }>
  export default timings
}
declare module 'voice-sample:*' {
  const url: string
  export default url
}
