import type {Vec3} from '../types.ts'

/** Additional interactive specimens do not renumber the 32 decorative combinations. */
export const destructiblePlants = [
  {
    id: 'birdOfParadise',
    title: 'Bird of paradise',
    number: 33,
    pot: 'atelier',
    position: [-4.6, 0, 4.9] as Vec3,
  },
  {
    id: 'peaceLily',
    title: 'Peace lily',
    number: 34,
    pot: 'ivory',
    position: [4.6, 0, 4.9] as Vec3,
  },
] as const
export type DestructiblePlantKind = (typeof destructiblePlants)[number]['id']
