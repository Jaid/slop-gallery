import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'abyssal_velvet',
  candidateId: 'claude_opus',
  title: 'Abyssal Velvet',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Opus 5',
      slug: 'anthropic/claude-opus-5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Midnight folds itself around a faint, saltwater glow.',
  placeholder: {
    color: '#1f6f74',
    shading: 'fabric',
  },
} as const satisfies KnotData
