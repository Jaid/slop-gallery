import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'moire_sanctum',
  candidateId: 'claude_fable',
  title: 'Moiré Sanctum',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Fable 5.1',
      slug: 'anthropic/claude-fable-5.1',
      effortLevel: 'max',
    },
  },
  flavorText: 'Layered screens turn the smallest movement into a hidden ceremony.',
  placeholder: {
    color: '#d4af37',
    shading: 'smooth',
  },
} as const satisfies KnotData
