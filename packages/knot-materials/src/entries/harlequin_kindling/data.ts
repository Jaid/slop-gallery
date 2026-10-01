import type {KnotData} from '../../types.ts'

// Mage run: 8EWpDkWx6nfkCqt; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'harlequin_kindling',
  candidateId: 'claude_sonnet',
  title: 'Harlequin Kindling',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Sonnet 5.5',
      slug: 'anthropic/claude-sonnet-5.5',
      effortLevel: 'max',
    },
  },
  flavorText: 'Buried in black stone, a million silica spheres bend daylight into patches of fire that ignite only at the angle you happen to stand.',
  placeholder: {
    color: '#06161f',
    shading: 'glass',
  },
} as const satisfies KnotData
