import type {KnotCandidateData} from '../../types.ts'

const symbolUrl = new URL('symbol.svg', import.meta.url)
export default {
  id: 'gpt_terra',
  title: 'GPT Terra',
  icon: symbolUrl.href,
} as const satisfies KnotCandidateData
