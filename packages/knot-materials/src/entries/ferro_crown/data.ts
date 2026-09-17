import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'ferro_crown',
  candidateId: 'claude_opus',
  title: 'Ferro Crown',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Opus 5',
      slug: 'anthropic/claude-opus-5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'A black crown rises to meet an invisible command.',
  placeholder: {
    color: '#1b2230',
    shading: 'metal',
  },
  displacement: 0.06,
} as const satisfies KnotData
