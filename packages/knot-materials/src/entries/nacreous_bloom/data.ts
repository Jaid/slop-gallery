import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'nacreous_bloom',
  candidateId: 'deepseek',
  title: 'Nacreous Bloom',
  harness: 'none',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'max',
    },
  },
  flavorText: 'Pale pearl opens like a flower beneath a changeable sky.',
  placeholder: {
    color: '#ffb7e8',
    shading: 'fabric',
  },
  archived: true,
} as const satisfies KnotData
