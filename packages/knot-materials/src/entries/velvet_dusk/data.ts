import type {KnotData} from '../../types.ts'

// Mage run: 3gQGAbAm59HYY8k; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'velvet_dusk',
  candidateId: 'claude_haiku',
  title: 'Velvet Dusk',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Haiku 5.5',
      slug: 'anthropic/claude-haiku-5.5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Plum-black pile lies combed in one direction, then turns its nap against your gaze, and the dusk brightens in a damask no one was meant to see.',
  placeholder: {
    color: '#21132f',
    shading: 'fabric',
  },
} as const satisfies KnotData
