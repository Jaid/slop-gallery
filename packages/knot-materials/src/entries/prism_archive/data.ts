import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'prism_archive',
  candidateId: 'gpt_astra',
  title: 'Prism Archive',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'max',
    },
  },
  flavorText: 'Light was folded into a silver archive. Each angle unlocks another spectrum; each step rewrites what you thought you saw.',
  placeholder: {
    color: '#a7b8c2',
    shading: 'metal',
  },
} as const satisfies KnotData
