import type {KnotData} from '../../types.ts'

// Mage run: DZoyAbZAQlwnlPj; fixture: knot-material-shaders; result: success.
export default {
  id: 'lantern_koi',
  candidateId: 'claude_opus',
  title: 'Lantern Koi',
  createdAt: 1_792_085_143,
  harness: 'Mage',
  author: {model: {
    title: 'Claude Opus 5.5',
    slug: 'anthropic/claude-opus-5.5',
    effortLevel: 'high',
  }},
  flavorText: 'A paper lantern on a summer night. Inside, the candle has company: koi circling unhurried, their shadows sharp only where they brush the paper.',
  placeholder: {
    color: '#a27b4e',
    shading: 'fabric',
  },
} as const satisfies KnotData
