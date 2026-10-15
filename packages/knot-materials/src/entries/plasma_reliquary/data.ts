import type {KnotData} from '../../types.ts'

// Mage run: 4eznRMVv3vZMHhr; fixture: knot-material-shaders; result: success.
export default {
  id: 'plasma_reliquary',
  candidateId: 'claude_opus',
  title: 'Plasma Reliquary',
  harness: 'Mage',
  author: {model: {
    title: 'Claude Opus 5.5',
    slug: 'anthropic/claude-opus-5.5',
    effortLevel: 'high',
  }},
  flavorText: 'A captive storm in a vessel of sealed glass. It has never been touched, yet every tendril strains toward the last warm thing to come near.',
  placeholder: {
    color: '#514a5f',
    shading: 'glass',
  },
} as const satisfies KnotData
