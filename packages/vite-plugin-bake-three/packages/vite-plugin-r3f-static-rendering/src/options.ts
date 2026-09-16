import type {RenderBundlesOptions} from './features/renderBundles.ts'
import type {StaticInstancingOptions} from './features/staticInstancing.ts'
import type {StaticDiagnostic} from './plan.ts'

import {defaultRenderBundlesOptions} from './features/renderBundles.ts'
import {defaultStaticInstancingOptions} from './features/staticInstancing.ts'

export type R3fStaticRenderingOptions = {
  exclude?: ((id: string) => boolean) | RegExp
  include?: ((id: string) => boolean) | RegExp
  maxNodes?: number
  maxPlanBytes?: number
  onDiagnostic?: (diagnostic: StaticDiagnostic) => void
  renderBundles?: RenderBundlesOptions | false
  report?: boolean
  /** Module specifier used by generated client code for the StaticScene runtime. */
  runtimeModule?: string
  staticInstancing?: StaticInstancingOptions | false
  timeoutMs?: number
}
export type ResolvedR3fStaticRenderingOptions = {
  renderBundles: Required<RenderBundlesOptions> | false
  staticInstancing: Required<StaticInstancingOptions> | false
}
export function resolveR3fStaticRenderingOptions(options: R3fStaticRenderingOptions = {}): ResolvedR3fStaticRenderingOptions {
  const result = {
    staticInstancing: options.staticInstancing === false ? false as const : {
      ...defaultStaticInstancingOptions,
      ...options.staticInstancing,
    },
    renderBundles: options.renderBundles === false ? false as const : {
      ...defaultRenderBundlesOptions,
      ...options.renderBundles,
    },
  }
  if (result.staticInstancing && (!Number.isSafeInteger(result.staticInstancing.minimumCount) || result.staticInstancing.minimumCount < 2)) {
    throw new RangeError('minimumCount must be an integer of at least 2.')
  }
  if (result.renderBundles && (!Number.isSafeInteger(result.renderBundles.minimumObjects) || result.renderBundles.minimumObjects < 2)) {
    throw new RangeError('minimumObjects must be an integer of at least 2.')
  }
  for (const name of ['timeoutMs', 'maxNodes', 'maxPlanBytes'] as const) {
    if (options[name] !== undefined && (!Number.isSafeInteger(options[name]) || options[name] <= 0)) {
      throw new RangeError(`${name} must be a positive integer.`)
    }
  }
  return result
}
