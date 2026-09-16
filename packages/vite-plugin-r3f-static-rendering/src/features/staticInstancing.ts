import type {StaticRenderCandidate} from '../analysis.ts'

export type StaticInstancingOptions = {
  enabled?: boolean
  /** Avoid replacing tiny groups where one draw call is not worth the indirection. */
  minimumCount?: number
}

export const defaultStaticInstancingOptions = {
  enabled: true,
  minimumCount: 3,
} as const satisfies Required<StaticInstancingOptions>

/** Facts required before a repeated JSX family may become one InstancedMesh. */
export function canInstance(candidate: StaticRenderCandidate) {
  const {facts, instanceGroup} = candidate
  return Boolean(instanceGroup
    && facts.structure
    && facts.transforms
    && facts.geometry
    && facts.material
    && facts.interactionFree
    && facts.imperativeFree)
}
