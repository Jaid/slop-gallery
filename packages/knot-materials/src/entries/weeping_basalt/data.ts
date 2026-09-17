import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'weeping_basalt',
  candidateId: 'gpt_sol',
  title: 'Weeping Basalt',
  harness: 'none',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
      slug: 'openai/gpt-5.6-sol',
      effortLevel: 'max',
    },
  },
  flavorText: 'Dark stone lets a little of its buried heat escape in glowing tears.',
  placeholder: {
    color: '#86cbd8',
    shading: 'stone',
  },
} as const satisfies KnotData
