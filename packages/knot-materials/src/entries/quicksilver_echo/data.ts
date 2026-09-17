import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'quicksilver_echo',
  candidateId: 'claude_fable',
  title: 'Quicksilver Echo',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Fable 5.1',
      slug: 'anthropic/claude-fable-5.1',
      effortLevel: 'max',
    },
  },
  flavorText: 'The silver answers every movement with a reflection that seems almost remembered.',
  placeholder: {
    color: '#e6efff',
    shading: 'liquid',
  },
} as const satisfies KnotData
