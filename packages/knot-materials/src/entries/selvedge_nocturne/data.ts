import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'selvedge_nocturne',
  candidateId: 'gpt_astra',
  title: 'Selvedge Nocturne',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A midnight loom remembers the plumage of an extinct bird. Every passing gaze draws another filament out of the dark.',
  placeholder: {
    color: '#23585d',
    shading: 'fabric',
  },
} as const satisfies KnotData
