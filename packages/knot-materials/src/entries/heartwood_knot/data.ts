import type {KnotData} from '../../types.ts'

export default {
  id: 'heartwood_knot',
  candidateId: 'deepseek',
  title: 'Heartwood Knot',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A century of slow rain, cut open and polished until the light walks along it.',
  placeholder: {
    color: '#5e2a0f',
    shading: 'smooth',
  },
} as const satisfies KnotData
