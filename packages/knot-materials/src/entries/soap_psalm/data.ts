import type {KnotData} from '../../types.ts'

// Mage run: 3gQGAbAm59HYY8k; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'soap_psalm',
  candidateId: 'claude_haiku',
  title: 'Soap Psalm',
  createdAt: 1791758567,
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Haiku 5.5',
      slug: 'anthropic/claude-haiku-5.5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'A film of soap no thicker than light holds a sermon in color, and every drifting band of it rewrites itself as you circle.',
  placeholder: {
    color: '#cbcbfa',
    shading: 'glass',
  },
} as const satisfies KnotData
