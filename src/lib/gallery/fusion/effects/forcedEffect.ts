import optis from 'optis'
import readPermalink from 'read-permalink'

import {fusionEffects} from './index.ts'

const effectSchema = optis({
  defaults: {
    fusion_effect: '',
  },
  normalizations: {
    fusion_effect(value: unknown) {
      return fusionEffects.find(effect => effect.id === value)?.id ?? ''
    },
  },
})

/** Read the `?fusion_effect`, the id of an effect every fusion’s portal shows instead of its ingredients’ own, like `halloween-candy`, for comparing effects with any ingredient; empty for none or an id no effect has. */
export function readFusionEffect(input: URL | string = typeof location === 'undefined' ? '' : location.href): string {
  return readPermalink(input, {schema: effectSchema}).fusion_effect
}

/** the effect `?fusion_effect` makes every fusion’s portal show for the page’s whole session, read once at startup, or undefined */
export const forcedEffect = fusionEffects.find(effect => effect.id === readFusionEffect())
