import type {KnotCandidateData} from '../../types.ts'

export default {
  id: 'kimi',
  title: 'Kimi',
  icon: new URL('symbol.svg', import.meta.url).href,
} as const satisfies KnotCandidateData
