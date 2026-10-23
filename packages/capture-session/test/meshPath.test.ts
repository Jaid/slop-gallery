import {describe, expect, test} from 'bun:test'

import {Group, Mesh} from 'three/webgpu'

import {collectMeshPath, matchesMeshPath} from '../src/meshPath.ts'

const named = <T extends Group | Mesh>(object: T, name: string) => Object.assign(object, {name})
describe('mesh paths', () => {
  const scene = named(new Group, 'scene')
  const fountain = named(new Group, 'lobby-fountain')
  const water = named(new Mesh, 'fountain-falling-water')
  const otherWater = named(new Mesh, 'fountain-falling-water')
  const bench = named(new Mesh, 'bench')
  fountain.add(water)
  scene.add(fountain, otherWater, bench)
  test('a path matches an object by its name and its nearest ancestors’ names', () => {
    expect(matchesMeshPath(fountain, 'lobby-fountain')).toBe(true)
    expect(matchesMeshPath(water, 'lobby-fountain/fountain-falling-water')).toBe(true)
    expect(matchesMeshPath(otherWater, 'lobby-fountain/fountain-falling-water')).toBe(false)
    expect(matchesMeshPath(water, 'scene/fountain-falling-water')).toBe(false)
  })
  test('the highlight takes everything below the path’s end', () => {
    expect(collectMeshPath(scene, 'lobby-fountain')).toEqual([fountain, water])
    expect(collectMeshPath(scene, 'fountain-falling-water')).toEqual([water, otherWater])
    expect(collectMeshPath(scene, 'missing')).toEqual([])
  })
})
