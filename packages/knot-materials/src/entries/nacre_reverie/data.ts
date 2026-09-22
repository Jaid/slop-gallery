import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'nacre_reverie',
  candidateId: 'gpt_astra',
  title: 'Nacre Reverie',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'max',
    },
  },
  flavorText: 'The moon left its unfinished colors inside a shell. They drift between its silver pages, too softly to become a rainbow.',
  placeholder: {
    color: '#c8b6bf',
    shading: 'glass',
  },
} as const satisfies KnotData
