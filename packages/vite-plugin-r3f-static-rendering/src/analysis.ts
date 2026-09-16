export type StaticRenderReason =
  | 'dynamic-children'
  | 'dynamic-geometry'
  | 'dynamic-material'
  | 'dynamic-transform'
  | 'event-handler'
  | 'imperative-ref'
  | 'non-renderable-descendant'
  | 'runtime-visibility'
  | 'unknown-component'

export type StaticRenderFacts = {
  /** Geometry identity is invariant and can be compared across siblings. */
  geometry: boolean
  /** No ref is observed by application code which could mutate this object imperatively. */
  imperativeFree: boolean
  /** No React/Three event handler gives an individual object behavioral identity. */
  interactionFree: boolean
  /** Material identity and material assignment are invariant. */
  material: boolean
  reasons: ReadonlySet<StaticRenderReason>
  /** Descendants are renderable objects supported by Three BundleGroup. */
  renderableOnly: boolean
  /** Children and their order are invariant for the build. */
  structure: boolean
  /** Local/world transforms are invariant after mount. */
  transforms: boolean
}

export type StaticInstanceGroup = {
  /** Source elements which can become one InstancedMesh. */
  count: number
  geometryKey: string
  materialKey: string
  /** Matrix data can be emitted directly when all transforms are build-time values. */
  matricesStatic: boolean
}

export type StaticRenderCandidate = {
  facts: StaticRenderFacts
  /** Present when identical geometry/material siblings can be collapsed to instancing. */
  instanceGroup?: StaticInstanceGroup
  /** Present when this subtree can be represented by a static WebGPU BundleGroup. */
  renderBundle: boolean
}

/**
 * Shared proof model for all R3F static-render transforms.
 *
 * The eventual analyzer should resolve bindings and closed data through the same
 * SourceGraph/Recipe infrastructure used by the resource bakers, then add JSX-
 * specific facts here. Feature transforms consume facts; they must not each grow
 * their own, subtly different definition of “static”.
 */
export type StaticRenderAnalyzer = {
  analyze: (id: string, code: string) => Promise<ReadonlyArray<StaticRenderCandidate>>
}
