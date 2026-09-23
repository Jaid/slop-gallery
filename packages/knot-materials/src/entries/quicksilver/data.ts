import type {KnotData} from '../../types.ts'

export default {
  id: 'quicksilver',
  candidateId: 'deepseek',
  title: 'Quicksilver',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  displacement: 0.011,
  flavorText: 'It has no color of its own, so it borrows the room and gives it back.',
  placeholder: {
    color: '#7d8894',
    shading: 'liquid',
  },
} as const satisfies KnotData
