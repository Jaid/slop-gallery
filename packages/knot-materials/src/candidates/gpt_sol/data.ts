import type {KnotCandidateData} from '../../types.ts'

const symbolUrl = new URL('symbol.svg', import.meta.url)
export default {
  id: 'gpt_sol',
  title: 'GPT Sol',
  icon: symbolUrl.href,
} as const satisfies KnotCandidateData
