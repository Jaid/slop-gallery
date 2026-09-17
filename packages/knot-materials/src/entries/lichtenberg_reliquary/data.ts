import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'lichtenberg_reliquary',
  candidateId: 'claude_fable',
  title: 'Lichtenberg Reliquary',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Fable 5.1',
      slug: 'anthropic/claude-fable-5.1',
      effortLevel: 'max',
    },
  },
  flavorText: 'A branching flash rests inside its vessel like a saint of brief things.',
  placeholder: {
    color: '#6d8dff',
    shading: 'smooth',
  },
} as const satisfies KnotData
