import type {KnotCandidateData} from '../types.ts'

export default {
  id: 'qwen_max',
  title: 'Qwen Max',
  icon: new URL('icon.jxl', import.meta.url).href,
} as const satisfies KnotCandidateData
