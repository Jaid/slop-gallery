import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'shatterlight',
  candidateId: 'deepseek',
  title: 'Shatterlight',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A mirror that was broken on purpose, then bound with gold, so every shard can keep a different piece of the room.',
  placeholder: {
    color: '#b3bed1',
    shading: 'metal',
  },
} as const satisfies KnotData
