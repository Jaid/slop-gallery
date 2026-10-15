import type {KnotCandidateData} from '../../types.ts'

const symbolUrl = new URL('symbol.svg', import.meta.url)
export default {
  id: 'gemini_flash',
  title: 'Gemini Flash',
  icon: symbolUrl.href,
} as const satisfies KnotCandidateData
