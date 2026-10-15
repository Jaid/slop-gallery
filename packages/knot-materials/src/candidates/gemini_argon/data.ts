import type {KnotCandidateData} from '../../types.ts'

const symbolUrl = new URL('symbol.svg', import.meta.url)
export default {
  id: 'gemini_argon',
  title: 'Gemini Argon',
  icon: symbolUrl.href,
} as const satisfies KnotCandidateData
