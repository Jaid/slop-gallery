import type {KnotCandidateData} from '../../types.ts'

const symbolUrl = new URL('symbol.svg', import.meta.url)
export default {
  id: 'qwen_max',
  title: 'Qwen Max',
  icon: symbolUrl.href,
} as const satisfies KnotCandidateData
