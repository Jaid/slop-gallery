import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'crescent_velvet',
  candidateId: 'gpt_terra',
  title: 'Crescent Velvet',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-5.6 Terra',
      slug: 'openai/gpt-5.6-terra',
      effortLevel: 'max',
    },
  },
  flavorText: 'Midnight pile absorbs the room until a constellation of warm crescents wakes beneath your gaze.',
  placeholder: {
    color: '#32112a',
    shading: 'fabric',
  },
} as const satisfies KnotData
