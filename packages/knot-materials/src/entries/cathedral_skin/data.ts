import type {KnotData} from '../../types.ts'

// Mage run: 2b7SAOfgKTVu0qb; fixture: knot-material-shaders; result: success.
export default {
  id: 'cathedral_skin',
  candidateId: 'muse_wonder',
  title: 'Cathedral Skin',
  harness: 'Mage',
  author: {
    model: {
      title: 'Muse Wonder 1.0',
      slug: 'meta/muse-wonder-1.0',
      effortLevel: 'max',
    },
  },
  flavorText: 'A thousand jewel panes are leaded in gold upon one skin; lean close and each small window keeps its own weather.',
  placeholder: {
    color: '#bea8b4',
    shading: 'glass',
  },
} as const satisfies KnotData
