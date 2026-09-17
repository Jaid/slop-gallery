import type {KnotCandidateData} from '../../types.ts'

export default {
  id: 'gpt_astra',
  title: 'GPT Astra',
  icon: new URL('icon.jxl', import.meta.url).href,
} as const satisfies KnotCandidateData
