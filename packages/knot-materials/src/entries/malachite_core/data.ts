import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'malachite_core',
  candidateId: 'claude_opus',
  title: 'Malachite Core',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Opus 5',
      slug: 'anthropic/claude-opus-5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'A small green world keeps growing inward beneath its polished surface.',
  placeholder: {
    color: '#1e7a52',
    shading: 'stone',
  },
} as const satisfies KnotData
