import type {GameLevel} from 'vite-plugin-game-level'

type Level = GameLevel & {
  title: string
}

const levels = {
  gallery: {
    title: 'Slop Gallery',
    directory: 'src/levels/gallery',
    publicAssets: ['art', 'audio'],
  },
  knottingham: {
    title: 'Knottingham',
    directory: 'src/levels/knottingham',
    publicAssets: [],
  },
} as const satisfies Record<string, Level>

export type LevelId = keyof typeof levels
export const levelIds = Object.keys(levels) as Array<LevelId>
export const defaultLevel = 'gallery' satisfies LevelId

export default levels
