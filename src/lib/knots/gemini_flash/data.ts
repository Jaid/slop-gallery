import type {KnotCandidateData} from '../types.ts'

export default {
  id: 'gemini_flash',
  title: 'Gemini Flash',
  icon: new URL('icon.jxl', import.meta.url).href,
} as const satisfies KnotCandidateData
