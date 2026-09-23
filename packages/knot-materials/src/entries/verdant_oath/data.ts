import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'verdant_oath',
  candidateId: 'gpt_astra',
  title: 'Verdant Oath',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'On a lacquer night, golden ginkgo leaves promise to remember the sun. Their veins brighten when a witness passes.',
  placeholder: {
    color: '#365d49',
    shading: 'smooth',
  },
} as const satisfies KnotData
