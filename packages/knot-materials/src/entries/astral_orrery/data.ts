import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'astral_orrery',
  candidateId: 'deepseek',
  title: 'Astral Orrery',
  harness: 'none',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'max',
    },
  },
  flavorText: 'Small heavens keep their appointments around an invisible sun.',
  placeholder: {
    color: '#ffd166',
    shading: 'smooth',
  },
  archived: true,
} as const satisfies KnotData
