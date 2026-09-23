import type {KnotData} from '../../types.ts'

export default {
  id: 'moth_reliquary',
  candidateId: 'grok',
  title: 'Moth Reliquary',
  harness: 'Mage',
  author: {
    model: {
      title: 'Grok 4.7',
      slug: 'x-ai/grok-4.7',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Dust from a moth that learned stained glass. It brightens only for whoever bothers to come close.',
  placeholder: {
    color: '#ba7946',
    shading: 'fabric',
  },
} as const satisfies KnotData
