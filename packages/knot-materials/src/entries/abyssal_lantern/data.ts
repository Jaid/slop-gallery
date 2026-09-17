import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'abyssal_lantern',
  candidateId: 'gpt_astra',
  title: 'Abyssal Lantern',
  harness: 'Codex',
  author: {
    model: {
      title: 'GPT-6 Astra',
    },
  },
  flavorText: 'One small beacon keeps watch at the bottom of the world.',
  placeholder: {
    color: '#46d6ff',
    shading: 'glass',
  },
} as const satisfies KnotData
