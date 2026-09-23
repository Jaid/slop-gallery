import type {KnotData} from '../../types.ts'

export default {
  id: 'mycelium_choir',
  candidateId: 'grok',
  title: 'Mycelium Choir',
  harness: 'grok.com Build',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  flavorText: 'A thousand quiet filaments pass the same bright note from branch to branch.',
  placeholder: {
    color: '#6dffb0',
    shading: 'fabric',
  },
} as const satisfies KnotData
