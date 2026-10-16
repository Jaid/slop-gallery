import type {KnotData} from '../../types.ts'

// Mage run: I3AQt6jqWYHzO6i; fixture: knot-material-dot; result: success.
export default {
  id: 'knotty_prince',
  candidateId: 'claude_opus',
  title: 'Knotty Prince',
  createdAt: 1791761130,
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Opus 5.5',
      slug: 'anthropic/claude-opus-5.5',
      effortLevel: 'medium',
    },
  },
  displacement: 0.02,
  flavorText: 'Sewn from lime felt and one very long thought, he keeps his bow tie straight and his eyes on you – just in case you are the one with the kiss.',
  placeholder: {
    color: '#89b950',
    shading: 'fabric',
  },
} as const satisfies KnotData
