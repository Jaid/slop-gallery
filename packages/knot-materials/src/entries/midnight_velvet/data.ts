import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'midnight_velvet',
  candidateId: 'gpt_luna',
  title: 'Midnight Velvet',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-5.6 Luna',
      slug: 'openai/gpt-5.6-luna',
      effortLevel: 'max',
    },
  },
  flavorText: 'Midnight velvet remembers every hand of light, turning a quiet orbit into a whisper of color.',
  displacement: 0.001,
  placeholder: {
    color: '#28103f',
    shading: 'fabric',
  },
} as const satisfies KnotData
