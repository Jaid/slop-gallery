import type {KnotCandidateData} from '../../types.ts'

export default {
  id: 'gpt_luna',
  title: 'GPT Luna',
  icon: new URL('symbol.svg', import.meta.url).href,
} as const satisfies KnotCandidateData
