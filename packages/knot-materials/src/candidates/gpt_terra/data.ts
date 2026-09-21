import type {KnotCandidateData} from '../../types.ts'

export default {
  id: 'gpt_terra',
  title: 'GPT Terra',
  icon: new URL('icon.jxl', import.meta.url).href,
} as const satisfies KnotCandidateData
