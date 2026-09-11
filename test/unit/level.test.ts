import type {PlayerPose} from '../../src/lib/gallery/types.ts'
import type {ReactElement} from 'react'

import {describe, expect, test} from 'bun:test'
import {resolve} from 'node:path'

import {selectGameLevel} from 'vite-plugin-game-level'

import levels, {defaultLevel, levelIds} from '../../src/data/levels.ts'
import {initialPortraits as museumPortraits} from '../../src/levels/gallery/collection.ts'
import {insideLevel as insideMuseum, playerSpawn as museumSpawn} from '../../src/levels/gallery/navigation.ts'
import {initialPortraits as knotPortraits} from '../../src/levels/knottingham/collection.ts'
import {insideLevel as insideKnots, playerSpawn as knotSpawn, levelFloorHeight, woodenFloor} from '../../src/levels/knottingham/navigation.ts'
import {knotGalleryBounds} from '../../src/lib/gallery/knotGallery.ts'

const farKnotPosition: PlayerPose['position'] = [knotGalleryBounds.maxX - 2, 0.04, knotGalleryBounds.northZ + 2]
const parseGalleryLevel = (value?: string) => selectGameLevel(value, levelIds, defaultLevel)
describe('build-time levels', () => {
  test('keeps every level-specific component in its own index entry', async () => {
    const files = await Array.fromAsync(new Bun.Glob('src/components/levels/**/*.tsx').scan())
    expect(files.length).toBeGreaterThan(40)
    for (const file of files) {
      expect(file.replaceAll('\\', '/')).toMatch(/^src\/components\/levels\/(gallery|knottingham)\/[^/]+\/index\.tsx$/u)
    }
  })
  test('defines level titles, entry directories and assets in the shared data module', () => {
    expect(levelIds).toEqual(['gallery', 'knottingham'])
    expect(levels.gallery).toEqual({
      title: 'Slop Gallery',
      directory: 'src/levels/gallery',
      publicAssets: ['art', 'audio'],
    })
    expect(levels.knottingham).toEqual({
      title: 'Knottingham',
      directory: 'src/levels/knottingham',
      publicAssets: [],
    })
  })
  test('defaults to the museum and rejects invalid selections instead of silently deploying the wrong world', () => {
    expect(parseGalleryLevel()).toBe('gallery')
    expect(parseGalleryLevel('gallery')).toBe('gallery')
    expect(parseGalleryLevel('knottingham')).toBe('knottingham')
    for (const value of ['', 'knots', 'Knot-Gallery', 'slop-gallery', 'knot-gallery']) {
      expect(() => parseGalleryLevel(value)).toThrow('Invalid game level')
    }
  })
  test('uses independent spawn bounds and collections', () => {
    expect(insideKnots(knotSpawn.position)).toBe(true)
    expect(insideMuseum(museumSpawn.position)).toBe(true)
    expect(insideKnots(farKnotPosition)).toBe(true)
    expect(insideMuseum(farKnotPosition)).toBe(false)
    expect(insideKnots([0, 0, knotGalleryBounds.northZ - 1])).toBe(false)
    expect(levelFloorHeight(farKnotPosition)).toBe(0)
    expect(woodenFloor('vesper', [0, 0, 0])).toBe(false)
    expect(knotPortraits).toEqual([])
    expect(museumPortraits).toHaveLength(16)
  })
})
test('Knot build retains poses beyond the museum bounds and falls back safely', async () => {
  const result = await Bun.build({
    entrypoints: [resolve(import.meta.dir, '../../src/lib/gallery/PlayerSession.ts')],
    target: 'bun',
    define: {'import.meta.env.GAME_LEVEL': JSON.stringify('knottingham')},
    plugins: [
      {
        name: 'knot-level',
        setup(build) {
          build.onResolve({filter: /^#level\//u}, args => ({path: resolve(import.meta.dir, '../../src/levels/knottingham', args.path.slice(7))}))
        },
      },
    ],
  })
  if (!result.success) {
    throw new Error(JSON.stringify(result.logs))
  }
  const source = await result.outputs[0].text()
  const {PlayerSession, validatePlayerPose, playerSpawn} = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`) as typeof import('../../src/lib/gallery/PlayerSession.ts')
  const session = new PlayerSession
  const pose: PlayerPose = {
    position: farKnotPosition,
    yaw: 0.8,
    pitch: -0.1,
  }
  session.capture(pose)
  if (JSON.stringify(session.snapshot()) !== JSON.stringify(pose)) {
    throw new Error('Knot position was not retained.')
  }
  session.restore(pose)
  if (!validatePlayerPose(session.snapshot())) {
    throw new Error('Knot position was not restored.')
  }
  session.restore({
    position: [knotGalleryBounds.maxX + 1, 0, 0],
    yaw: 0,
    pitch: 0,
  })
  if (JSON.stringify(session.snapshot()) !== JSON.stringify(playerSpawn)) {
    throw new Error('Invalid position did not reset.')
  }
  expect(session.snapshot()).toEqual(playerSpawn)
})
test('Knottingham resets only its exhibition, without duplicate sibling keys or museum props', async () => {
  const result = await Bun.build({
    entrypoints: [resolve(import.meta.dir, '../../src/components/levels/knottingham/Scene/index.tsx')],
    target: 'bun',
    define: {'process.env.NODE_ENV': JSON.stringify('production')},
    plugins: [
      {
        name: 'scene-children',
        setup(build) {
          build.onResolve({filter: new RegExp(String.raw`^#(?:component/|src/lib/gallery\.ts$)`, 'u')}, args => ({
            path: args.path,
            namespace: 'scene-stub',
          }))
          build.onLoad({
            filter: /.*/u,
            namespace: 'scene-stub',
          }, ({path}) => ({
            contents: path === '#src/lib/gallery.ts' ? 'export const useGallery = selector => selector({resetEpoch: 42})' : `export default ${JSON.stringify(path)}`,
            loader: 'js',
          }))
        },
      },
    ],
  })
  expect(result.success).toBe(true)
  const source = await result.outputs[0].text()
  const {default: scene} = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`) as {default: () => ReactElement<{children: Array<ReactElement>}>}
  const children = scene().props.children
  expect(children.map(child => child.type)).toEqual([
    '#component/levels/knottingham/KnotLobby',
    '#component/levels/knottingham/KnotSpectation',
    '#component/levels/knottingham/KnotExhibition',
  ])
  expect(children.map(child => child.key)).toEqual([null, null, '42'])
})
