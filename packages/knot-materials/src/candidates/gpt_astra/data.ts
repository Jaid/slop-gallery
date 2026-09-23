import type {KnotCandidateData} from '../../types.ts'

export default {
  id: 'gpt_astra',
  title: 'GPT Astra',
  icon: new URL('symbol.svg', import.meta.url).href,
} as const satisfies KnotCandidateData
