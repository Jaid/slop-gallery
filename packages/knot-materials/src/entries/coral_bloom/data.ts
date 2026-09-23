import type {KnotData} from '../../types.ts'

export default {
  id: 'coral_bloom',
  candidateId: 'claude_sonnet',
  title: 'Coral Bloom',
  author: {
    model: {
      title: 'Claude Sonnet 5',
    },
  },
  flavorText: 'A submerged garden opens one luminous branch at a time.',
  placeholder: {
    color: '#ff85ab',
    shading: 'fabric',
  },
} as const satisfies KnotData
