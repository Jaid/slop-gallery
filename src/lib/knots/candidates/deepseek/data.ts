import type {KnotCandidateData} from '../../types.ts'

export default {
  id: 'deepseek',
  title: 'DeepSeek Flash',
  icon: new URL('icon.jxl', import.meta.url).href,
} as const satisfies KnotCandidateData
