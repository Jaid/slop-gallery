import type {StaticRenderCandidate} from '../analysis.ts'

export type StaticInstancingOptions = {
  enabled?: boolean
  minimumCount?: number
}
export const defaultStaticInstancingOptions = {
  enabled: true,
  minimumCount: 3,
} as const satisfies Required<StaticInstancingOptions>

export function canInstance(candidate: StaticRenderCandidate, options: Required<StaticInstancingOptions> = defaultStaticInstancingOptions) {
  const {facts, instanceGroup} = candidate
  return Boolean(options.enabled && instanceGroup && instanceGroup.count >= options.minimumCount && instanceGroup.matricesStatic
    && facts.structure && facts.transforms && facts.geometry && facts.material && facts.interactionFree && facts.imperativeFree)
}
