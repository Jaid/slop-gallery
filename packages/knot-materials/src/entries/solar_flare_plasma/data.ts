import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'solar_flare_plasma',
  candidateId: 'claude_sonnet',
  title: 'Solar Flare Plasma',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Sonnet 5',
      slug: 'anthropic/claude-sonnet-5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'A small captive eruption keeps reaching for a sky beyond its vessel.',
  placeholder: {
    color: '#ff6a00',
    shading: 'liquid',
  },
} as const satisfies KnotData
