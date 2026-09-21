import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'shardlight',
  candidateId: 'deepseek',
  title: 'Shardlight',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A thousand mirrors agree to disagree about where the light comes from.',
  displacement: 0.005,
  placeholder: {
    color: '#586676',
    shading: 'metal',
  },
} as const satisfies KnotData
