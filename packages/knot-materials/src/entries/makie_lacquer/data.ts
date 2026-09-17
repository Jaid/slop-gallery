import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'makie_lacquer',
  candidateId: 'claude_fable',
  title: 'Maki-e Lacquer',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Fable 5.1',
      slug: 'anthropic/claude-fable-5.1',
      effortLevel: 'max',
    },
  },
  flavorText: 'Gold dust settles into deep lacquer like stars into a still night.',
  placeholder: {
    color: '#f5c451',
    shading: 'smooth',
  },
} as const satisfies KnotData
