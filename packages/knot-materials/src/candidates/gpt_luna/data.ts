import type {KnotCandidateData} from '../../types.ts'

export default {
  id: 'gpt_luna',
  title: 'GPT Luna',
  icon: new URL('icon.jxl', import.meta.url).href,
} as const satisfies KnotCandidateData
