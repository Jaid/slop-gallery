import type {RenderBundlesOptions} from './features/renderBundles.ts'
import type {StaticInstancingOptions} from './features/staticInstancing.ts'
import type {Plugin} from 'vite'

import {defaultRenderBundlesOptions} from './features/renderBundles.ts'
import {defaultStaticInstancingOptions} from './features/staticInstancing.ts'

export type R3fStaticRenderingOptions = {
  renderBundles?: RenderBundlesOptions | false
  staticInstancing?: StaticInstancingOptions | false
}

export type ResolvedR3fStaticRenderingOptions = {
  renderBundles: Required<RenderBundlesOptions> | false
  staticInstancing: Required<StaticInstancingOptions> | false
}

export function resolveR3fStaticRenderingOptions(options: R3fStaticRenderingOptions = {}): ResolvedR3fStaticRenderingOptions {
  return {
    staticInstancing: options.staticInstancing === false ? false : {
      ...defaultStaticInstancingOptions,
      ...options.staticInstancing,
    },
    renderBundles: options.renderBundles === false ? false : {
      ...defaultRenderBundlesOptions,
      ...options.renderBundles,
    },
  }
}

/**
 * Package scaffold only. The shared proof model and feature ownership are fixed,
 * but transforms are intentionally not enabled until their semantic regressions exist.
 */
export default function r3fStaticRendering(_options: R3fStaticRenderingOptions = {}): Plugin {
  return {
    name: 'r3f-static-rendering',
    apply: 'build',
    enforce: 'pre',
  }
}

export type {StaticRenderAnalyzer, StaticRenderCandidate, StaticRenderFacts, StaticRenderReason} from './analysis.ts'
export {canBundle, defaultRenderBundlesOptions} from './features/renderBundles.ts'
export type {RenderBundlesOptions} from './features/renderBundles.ts'
export {canInstance, defaultStaticInstancingOptions} from './features/staticInstancing.ts'
export type {StaticInstancingOptions} from './features/staticInstancing.ts'
