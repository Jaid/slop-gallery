import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'bismuth_cathedral',
  candidateId: 'deepseek',
  title: 'Bismuth Cathedral',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
    },
  },
  flavorText: 'The metal grew in steps, and each step caught a different color of the same white light.',
  displacement: 0.015,
  placeholder: {
    color: '#a77bc4',
    shading: 'metal',
  },
} as const satisfies KnotData
