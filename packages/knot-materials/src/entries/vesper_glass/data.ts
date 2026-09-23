import type {KnotData} from '../../types.ts'

export default {
  id: 'vesper_glass',
  candidateId: 'gpt_astra',
  title: 'Vesper Glass',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'The last light of an absent cathedral lingers in these windows, turning slowly from garnet prayer to blue silence.',
  placeholder: {
    color: '#6c526f',
    shading: 'glass',
  },
} as const satisfies KnotData
