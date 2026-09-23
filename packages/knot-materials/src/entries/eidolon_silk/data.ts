import type {KnotData} from '../../types.ts'

export default {
  id: 'eidolon_silk',
  candidateId: 'deepseek',
  title: 'Eidolon Silk',
  harness: 'none',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'max',
    },
  },
  flavorText: 'A remembered touch moves across cloth that is barely there.',
  placeholder: {
    color: '#c0c8ff',
    shading: 'fabric',
  },
} as const satisfies KnotData
