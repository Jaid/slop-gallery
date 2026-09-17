import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'frost_lattice',
  candidateId: 'claude_sonnet',
  title: 'Frost Lattice',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Sonnet 5',
      slug: 'anthropic/claude-sonnet-5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Cold has given the air a delicate, repeating skeleton.',
  placeholder: {
    color: '#cfe8ff',
    shading: 'glass',
  },
  displacement: 0.004,
} as const satisfies KnotData
