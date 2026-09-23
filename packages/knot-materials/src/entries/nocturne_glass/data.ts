import type {KnotData} from '../../types.ts'

export default {
  id: 'nocturne_glass',
  candidateId: 'deepseek',
  title: 'Nocturne Glass',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Rain writes on the glass all night, and behind every drop the city keeps burning out of focus.',
  placeholder: {
    color: '#0a1220',
    shading: 'glass',
  },
} as const satisfies KnotData
