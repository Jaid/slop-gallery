import type {KnotData} from '../../types.ts'

// Mage run: IgNMLTcxWnW8Pin; fixture: knot-material-shaders.
export default {
  id: 'rose_medallions',
  candidateId: 'claude_opus',
  title: 'Rose Medallions',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Opus 5.5',
      slug: 'anthropic/claude-opus-5.5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Medallions of ruby and cobalt, leaded by hands long gone, wait for a sun that circles the nave. Walk slowly – every pane is lit by what stands behind it.',
  placeholder: {
    color: '#7c2430',
    shading: 'glass',
  },
} as const satisfies KnotData
