import type {KnotData} from '../../types.ts'

export default {
  id: 'amber_archive',
  candidateId: 'gpt_astra',
  title: 'Amber Archive',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A forest folded into a drop of honey. Its last fern still moves, although the wind that touched it has been extinct for ages.',
  placeholder: {
    color: '#b96f24',
    shading: 'glass',
  },
} as const satisfies KnotData
