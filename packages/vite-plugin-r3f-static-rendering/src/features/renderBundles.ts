import type {StaticRenderCandidate} from '../analysis.ts'

export type RenderBundlesOptions = {
  enabled?: boolean
  minimumObjects?: number
}
export const defaultRenderBundlesOptions = {
  enabled: true,
  minimumObjects: 4,
} as const satisfies Required<RenderBundlesOptions>

export function canBundle(candidate: StaticRenderCandidate, options: Required<RenderBundlesOptions> = defaultRenderBundlesOptions) {
  const {facts} = candidate
  return options.enabled && candidate.renderBundle && (candidate.renderObjectCount ?? candidate.instanceGroup?.count ?? 0) >= options.minimumObjects
    && facts.structure && facts.transforms && facts.geometry && facts.material && facts.imperativeFree && facts.renderableOnly
}
