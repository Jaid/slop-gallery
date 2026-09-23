import type {KnotCandidateData} from '../../types.ts'

export default {
  id: 'hy',
  title: 'Hy',
  icon: new URL('symbol.svg', import.meta.url).href,
} as const satisfies KnotCandidateData
