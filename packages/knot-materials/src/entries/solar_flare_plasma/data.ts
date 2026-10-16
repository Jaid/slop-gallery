import type {KnotData} from '../../types.ts'

export default {
  id: 'solar_flare_plasma',
  candidateId: 'claude_sonnet',
  title: 'Solar Flare Plasma',
  createdAt: 1789575270,
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
