import type {KnotCandidateData} from '../types.ts'

export default {
  id: 'sol',
  title: 'GPT Sol',
  icon: new URL('icon.jxl', import.meta.url).href,
} as const satisfies KnotCandidateData
