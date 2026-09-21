import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'velvet_eclipse',
  candidateId: 'gpt_terra',
  title: 'Velvet Eclipse',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-5.6 Terra',
      slug: 'openai/gpt-5.6-terra',
      effortLevel: 'max',
    },
  },
  flavorText: 'A blackened field of pile drinks the room’s light, then returns it in slow bruised constellations as you pass.',
  placeholder: {
    color: '#2a0b28',
    shading: 'fabric',
  },
} as const satisfies KnotData
