import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'prismatic_haunt',
  candidateId: 'deepseek',
  title: 'Prismatic Haunt',
  harness: 'chat.deepseek.com',
  author: {
    model: {
      title: 'DeepSeek',
      effortLevel: 'DeepThink',
    },
  },
  flavorText: 'An absent figure leaves only its colors moving through the glass.',
  placeholder: {
    color: '#c8e8ff',
    shading: 'ghost',
  },
} as const satisfies KnotData
