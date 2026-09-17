import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'celadon_crackle',
  candidateId: 'claude_opus',
  title: 'Celadon Crackle',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Opus 5',
      slug: 'anthropic/claude-opus-5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'A quiet green glaze holds a map of the moments it cooled.',
  placeholder: {
    color: '#9fc7b4',
    shading: 'stone',
  },
} as const satisfies KnotData
