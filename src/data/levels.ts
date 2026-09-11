import type {GameLevel} from 'vite-plugin-game-level'

type Level = GameLevel & {
  enterLabel: string
  storageKey: string
  supportsMap: boolean
  tagline: string
  title: string
}

const levels = {
  gallery: {
    title: 'Slop Gallery',
    directory: 'src/levels/gallery',
    publicAssets: ['art', 'audio'],
    storageKey: 'slop-gallery',
    tagline: 'Good taste. Questionable art.',
    enterLabel: 'Enter gallery',
    supportsMap: true,
  },
  knottingham: {
    title: 'Knottingham',
    directory: 'src/levels/knottingham',
    publicAssets: [],
    storageKey: 'knot-gallery',
    tagline: 'Light, motion and impossible materials.',
    enterLabel: 'Enter Knottingham',
    supportsMap: true,
  },
  soundboard: {
    title: 'Soundboard',
    directory: 'src/levels/soundboard',
    publicAssets: [],
    storageKey: 'slop-soundboard',
    tagline: 'Enabled sounds face the archived experiments.',
    enterLabel: 'Enter soundboard',
    supportsMap: false,
  },
} as const satisfies Record<string, Level>

export type LevelId = keyof typeof levels
export const levelIds = Object.keys(levels) as Array<LevelId>
export const defaultLevel = 'gallery' satisfies LevelId

export default levels
