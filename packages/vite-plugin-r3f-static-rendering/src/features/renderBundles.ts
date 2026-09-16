import type {StaticRenderCandidate} from '../analysis.ts'

export type RenderBundlesOptions = {
  enabled?: boolean
  /** Avoid wrapping tiny subtrees where bundle recording overhead dominates. */
  minimumObjects?: number
}

export const defaultRenderBundlesOptions = {
  enabled: true,
  minimumObjects: 4,
} as const satisfies Required<RenderBundlesOptions>

/** Facts required by Three BundleGroup's static render-bundle contract. */
export function canBundle(candidate: StaticRenderCandidate) {
  const {facts} = candidate
  return candidate.renderBundle
    && facts.structure
    && facts.transforms
    && facts.geometry
    && facts.material
    && facts.imperativeFree
    && facts.renderableOnly
}
