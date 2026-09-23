import type {KnotData} from '../../types.ts'

export default {
  id: 'quasar_silk',
  candidateId: 'gpt_terra',
  title: 'Quasar Silk',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-5.6 Terra',
      slug: 'openai/gpt-5.6-terra',
      effortLevel: 'max',
    },
  },
  flavorText: 'An impossible loom draws galaxies through midnight thread, rewarding every change of angle with a new current.',
  placeholder: {
    color: '#273578',
    shading: 'fabric',
  },
} as const satisfies KnotData
