import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'nebula_reliquary',
  candidateId: 'claude_fable',
  title: 'Nebula Reliquary',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Fable 5.1',
      slug: 'anthropic/claude-fable-5.1',
      effortLevel: 'max',
    },
  },
  flavorText: 'A little cosmic weather turns inside a shrine too small for its sky.',
  placeholder: {
    color: '#c47bff',
    shading: 'smooth',
  },
} as const satisfies KnotData
