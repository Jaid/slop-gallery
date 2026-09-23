import type {KnotData} from '../../types.ts'

export default {
  id: 'basalt_flux',
  candidateId: 'claude_opus',
  title: 'Basalt Flux',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Opus 5',
      slug: 'anthropic/claude-opus-5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Black stone yields, just enough to reveal the furnace underneath.',
  placeholder: {
    color: '#ff3b08',
    shading: 'stone',
  },
  displacement: 0.015,
} as const satisfies KnotData
