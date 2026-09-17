import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'abyssal_chromatophore',
  candidateId: 'claude_fable',
  title: 'Abyssal Chromatophore',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Fable 5.1',
      slug: 'anthropic/claude-fable-5.1',
      effortLevel: 'max',
    },
  },
  flavorText: 'The dark blushes when it notices you looking back.',
  placeholder: {
    color: '#2fe8ff',
    shading: 'smooth',
  },
  archived: true,
} as const satisfies KnotData
