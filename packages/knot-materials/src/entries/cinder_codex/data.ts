import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'cinder_codex',
  candidateId: 'muse_spark',
  title: 'Cinder Codex',
  harness: 'meta.ai',
  author: {
    model: {
      title: 'Muse Spark',
    },
  },
  flavorText: 'The last page of a burned library still glows between its lines.',
  placeholder: {
    color: '#ff6a00',
    shading: 'stone',
  },
} as const satisfies KnotData
