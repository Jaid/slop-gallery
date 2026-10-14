import type {KnotCandidateData} from '../../types.ts'

export default {
  id: 'gemini_argon',
  title: 'Gemini Argon',
  icon: new URL('symbol.svg', import.meta.url).href,
} as const satisfies KnotCandidateData
