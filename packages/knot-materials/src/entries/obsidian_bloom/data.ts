import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'obsidian_bloom',
  candidateId: 'deepseek',
  title: 'Obsidian Bloom',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  displacement: 0.013,
  flavorText: 'A mirror of cooled night, split by the bloom of the fire still living underneath it.',
  placeholder: {
    color: '#1c0802',
    shading: 'glass',
  },
} as const satisfies KnotData
