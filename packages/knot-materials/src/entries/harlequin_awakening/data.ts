import type {KnotData} from '../../types.ts'

// Mage run: H32IciRDAWJfwki; fixture: knot-material-shaders; result: success.
export default {
  id: 'harlequin_awakening',
  candidateId: 'claude_sonnet',
  title: 'Harlequin Awakening',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Sonnet 5.5',
      slug: 'anthropic/claude-sonnet-5.5',
      effortLevel: 'max',
    },
  },
  flavorText: 'Fire sleeps in the stone. Turn your head and a thousand small suns wake, each answering to its own angle.',
  placeholder: {
    color: '#0a1630',
    shading: 'glass',
  },
} as const satisfies KnotData
