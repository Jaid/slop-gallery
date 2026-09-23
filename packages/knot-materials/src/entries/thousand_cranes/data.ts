import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'thousand_cranes',
  candidateId: 'deepseek',
  title: 'Thousand Cranes',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  displacement: 0.03,
  flavorText: 'Fold a bird for every year of a stranger’s life, and the paper learns to hold a flock.',
  placeholder: {
    color: '#5f5849',
    shading: 'smooth',
  },
} as const satisfies KnotData
