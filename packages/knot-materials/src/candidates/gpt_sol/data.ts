import type {KnotCandidateData} from '../../types.ts'

export default {
  id: 'gpt_sol',
  title: 'GPT Sol',
  icon: new URL('symbol.svg', import.meta.url).href,
} as const satisfies KnotCandidateData
