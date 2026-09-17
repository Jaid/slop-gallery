import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'voltaic_lattice',
  candidateId: 'claude_opus',
  title: 'Voltaic Lattice',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Opus 5',
      slug: 'anthropic/claude-opus-5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'A fine framework passes blue sparks from one invisible charge to the next.',
  placeholder: {
    color: '#2b4cff',
    shading: 'glass',
  },
} as const satisfies KnotData
