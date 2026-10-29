import type {PlayerPose, Vec3} from '../../src/lib/gallery/types.ts'
import type {ReactElement} from 'react'

import {describe, expect, test} from 'bun:test'
import {readFileSync} from 'node:fs'
import {dirname, resolve} from 'node:path'

import {knotGalleryBounds} from '../../src/lib/gallery/knotGallery.ts'
import PlayerSession from '../../src/lib/gallery/PlayerSession.ts'
import world from '../../src/worlds/current.ts'
import slopGallery from '../../src/worlds/gallery/index.ts'
import galleryWalls from '../../src/worlds/gallery/walls.ts'
import {defaultWorld, knottinghamParameters, readWorld, selectWorld, worldIds, worlds} from '../../src/worlds/index.ts'
import knottingham from '../../src/worlds/knottingham/index.ts'

const root = resolve(import.meta.dir, '../..')
const farKnotPosition: Vec3 = [knotGalleryBounds.maxX - 2, 0.04, knotGalleryBounds.northZ + 2]
describe('world selection', () => {
  test('opens the gallery without parameters', () => {
    expect(defaultWorld).toBe('gallery')
    expect(selectWorld('')).toBe('gallery')
    expect(selectWorld('?seed=1&spawn=lobby')).toBe('gallery')
    expect(readWorld('http://localhost/')).toBe('gallery')
  })
  test('opens the world ?world names, even next to Knottingham’s parameters', () => {
    expect(selectWorld('?world=knottingham')).toBe('knottingham')
    expect(selectWorld('?world=gallery')).toBe('gallery')
    expect(selectWorld('?world=gallery&candidate=grok')).toBe('gallery')
    expect(readWorld('https://slop.gallery/?world=knottingham')).toBe('knottingham')
  })
  test('opens Knottingham for any of its own parameters, also bare ones', () => {
    for (const parameter of knottinghamParameters) {
      expect(selectWorld(`?${parameter}=1`)).toBe('knottingham')
      expect(selectWorld(`?seed=3&${parameter}`)).toBe('knottingham')
    }
  })
  test('ignores an unknown ?world', () => {
    expect(selectWorld('?world=knots')).toBe('gallery')
    expect(selectWorld('?world=soundboard&rarity=edit')).toBe('knottingham')
  })
  test('runs on its own, as the loading screen inlines its source', () => {
    const source = new Function(`return (${selectWorld.toString()})`) as () => typeof selectWorld
    const inlined = source()
    expect(inlined('?shots=2', knottinghamParameters)).toBe('knottingham')
    expect(inlined('?world=gallery&shots=2', knottinghamParameters)).toBe('gallery')
  })
  test('every world has a title and storage key of its own', () => {
    expect(worldIds).toEqual(['gallery', 'knottingham'])
    const storageKeys = new Set(worldIds.map(id => worlds[id].storageKey))
    const titles = new Set(worldIds.map(id => worlds[id].title))
    expect(storageKeys.size).toBe(worldIds.length)
    expect(titles.size).toBe(worldIds.length)
    expect(worlds.gallery.wallpaper).toBe('assets/wallpaper.jxl')
  })
  test('outside a page, the current world is the gallery', () => {
    expect(world).toBe(slopGallery)
  })
})
describe('worlds', () => {
  test('match their catalog entries', () => {
    for (const instance of [slopGallery, knottingham]) {
      expect(instance).toMatchObject(worlds[instance.id])
    }
  })
  test('use independent spawns, bounds and collections', () => {
    expect(knottingham.contains(knottingham.spawn.position)).toBe(true)
    expect(slopGallery.contains(slopGallery.spawn.position)).toBe(true)
    expect(knottingham.contains(farKnotPosition)).toBe(true)
    expect(slopGallery.contains(farKnotPosition)).toBe(false)
    expect(knottingham.contains([0, 0, knotGalleryBounds.northZ - 1])).toBe(false)
    expect(knottingham.floorHeight(farKnotPosition)).toBe(0)
    expect(knottingham.groundSurface('arena', [0, 0, 0])).toBe('generic')
    expect(knottingham.artworks).toEqual([])
    expect(slopGallery.artworks.length).toBeGreaterThan(0)
  })
  test('Knottingham is a single room, the Arena, which holds its spawn', () => {
    expect(knottingham.rooms.map(room => room.id)).toEqual(['arena'])
    const arena = knottingham.room('arena')
    expect(arena.title).toBe('Arena')
    expect(knottingham.roomAt(knottingham.spawn.position)).toBe(arena)
    expect(knottingham.roomAt(farKnotPosition)).toBe(arena)
    expect(knottingham.roomAt([0, 0, knotGalleryBounds.northZ - 5])).toBeUndefined()
    expect(knottingham.placement.contains(knottingham.placement.recoveryPosition)).toBe(true)
  })
  test('the gallery starts in the Lobby, between its north wall and the glass floor', () => {
    expect(slopGallery.defaultRoom).toBe('lobby')
    expect(slopGallery.spawn.position).toEqual([-3, 0.04, -30.3])
    expect(slopGallery.spawn.yaw).toBeCloseTo(-0.9 * Math.PI)
    expect(slopGallery.roomAt(slopGallery.spawn.position)?.id).toBe('lobby')
  })
  test('the gallery’s walls module, which the build bakes the architecture from, holds exactly the world’s walls', () => {
    expect(galleryWalls.map(wall => wall.room)).toEqual(slopGallery.rooms.flatMap(room => room.walls().map(() => room.id)))
    expect(galleryWalls).toEqual(slopGallery.walls)
  })
})
test('a Knottingham session retains poses beyond the gallery’s bounds and falls back to its own spawn', () => {
  const session = new PlayerSession(knottingham)
  const pose: PlayerPose = {
    position: farKnotPosition,
    yaw: 0.8,
    pitch: -0.1,
  }
  session.capture(pose)
  expect(session.snapshot()).toEqual(pose)
  session.restore(pose)
  expect(session.snapshot()).toEqual(pose)
  session.restore({
    position: [knotGalleryBounds.maxX + 1, 0, 0],
    yaw: 0,
    pitch: 0,
  })
  expect(session.snapshot()).toEqual(knottingham.spawn)
})
const transpilers = {
  ts: new Bun.Transpiler({loader: 'ts'}),
  tsx: new Bun.Transpiler({loader: 'tsx'}),
}
/** Every source module the files import when they run, all the way down. Type-only imports vanish when transpiled, and dynamic imports, like the lazy components’, only run later. */
const staticImports = (files: ReadonlyArray<string>) => {
  const seen = new Set<string>
  const pending = files.map(file => resolve(root, file))
  while (pending.length) {
    const file = pending.pop()!
    if (seen.has(file)) {
      continue
    }
    seen.add(file)
    for (const {kind, path} of transpilers[file.endsWith('.tsx') ? 'tsx' : 'ts'].scanImports(readFileSync(file, 'utf8'))) {
      if (kind === 'dynamic-import') {
        continue
      }
      const resolved = resolve(Bun.resolveSync(path, dirname(file)))
      if (resolved.startsWith(root) && !resolved.includes('node_modules') && /\.tsx?$/u.test(resolved)) {
        pending.push(resolved)
      }
    }
  }
  return seen
}
const worldModules = ['src/worlds/gallery/index.ts', 'src/worlds/knottingham/index.ts']
test('world modules never import the current world, which waits for them to load', () => {
  const imported = staticImports(worldModules)
  expect(imported.has(resolve(root, 'src/worlds/current.ts'))).toBe(false)
  expect(imported.size).toBeGreaterThan(50)
})
test('the page never imports a world itself, which only loads once its URL chose it', () => {
  const imported = staticImports(['src/main.tsx'])
  expect(worldModules.filter(file => imported.has(resolve(root, file)))).toEqual([])
  expect(imported.has(resolve(root, 'src/worlds/current.ts'))).toBe(true)
})
test('Knottingham’s Arena resets only its exhibition, without duplicate sibling keys or gallery props', async () => {
  const result = await Bun.build({
    entrypoints: [resolve(root, 'src/rooms/arena/components/ArenaRoom/index.tsx')],
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
  const {default: room} = await import(`data:text/javascript;base64,${Buffer.from(source).toBase64()}`) as {default: () => ReactElement<{children: Array<ReactElement>}>}
  const children = room().props.children
  expect(children.map(child => child.type)).toEqual([
    '#component/KnotLobby',
    '#component/KnotSpectation',
    '#component/KnotExhibition',
  ])
  expect(children.map(child => child.key)).toEqual([null, null, '42'])
})
