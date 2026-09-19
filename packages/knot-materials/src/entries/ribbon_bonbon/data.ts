import type {KnotData} from '../../types.ts'

export default {
  id: 'ribbon_bonbon',
  candidateId: 'gpt_astra',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'max',
    },
  },
  title: 'Ribbon Bonbon',
  flavorText: 'Strawberry and mint follow six sugar flutes around a confection with no first bite.',
  displacement: 0.02,
  placeholder: {
    color: '#e94069',
    shading: 'liquid',
  },
  icon: new URL('icon.jxl', import.meta.url).href,
} as const satisfies KnotData
