import type {KnotCandidateData} from '../../types.ts'

export default {
  id: 'muse_wonder',
  title: 'Muse Wonder',
  icon: new URL('symbol.svg', import.meta.url).href,
} as const satisfies KnotCandidateData
