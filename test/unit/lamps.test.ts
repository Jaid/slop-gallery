import type Passage from '../../src/lib/gallery/passages/Passage.ts'
import type {Vec3} from '../../src/lib/gallery/types.ts'
import type {PlacedLamp} from '../../src/worlds/base/PlacedRoom.ts'
import type {GalleryRoomId} from '../../src/worlds/gallery/SlopGallery.ts'
import type {BufferGeometry} from 'three/webgpu'

import {expect, test} from 'bun:test'

import {corridorPassage} from '../../src/lib/gallery/corridor.ts'
import {lobbyChandeliers} from '../../src/lib/gallery/lobbyVault.ts'
import {lodgeTunnel, lodgeTunnelTransition, lodgeWindowRibCutouts} from '../../src/lib/gallery/lodge.ts'
import TimberGeometry from '../../src/lib/gallery/passages/TimberGeometry.ts'
import VaultGeometry from '../../src/lib/gallery/passages/VaultGeometry.ts'
import {corridorLightSpacing, passagePendantMounts} from '../../src/lib/gallery/pendants/mounts.ts'
import slopGallery from '../../src/worlds/gallery/index.ts'
import relations, {visibleLamps} from '../../src/worlds/gallery/relations.ts'

const lamps = slopGallery.lamps()
const byId = new Map(lamps.map(lamp => [lamp.id, lamp]))
const lamp = (id: string) => {
  const result = byId.get(id)
  if (!result) {
    throw new Error(`The gallery has no lamp “${id}”.`)
  }
  return result
}
const expectNear = (actual: Vec3, expected: Vec3) => {
  for (const [index, value] of actual.entries()) {
    expect(value).toBeCloseTo(expected[index], 3)
  }
}
/** The lights of a passage’s kept lanterns in world meters, hung like the fixtures that carry them: the mounts the lantern bodies hang from, by index, each light lowered by its drop. */
const lanterns = (passage: Passage, surfaces: ReadonlyArray<BufferGeometry>, kept: ReadonlyArray<readonly [index: number, drop: number]>, spacing?: number, ribs?: BufferGeometry) => {
  const mounts = passagePendantMounts(passage, surfaces, spacing, ribs)
  return kept.map(([index, drop]): Vec3 => [mounts[index].light[0], mounts[index].light[1] + drop, mounts[index].light[2]])
}
test('every lamp has a world-wide id of its own and lies in its own room', () => {
  expect(byId.size).toBe(lamps.length)
  expect(lamps.length).toBe(32)
  for (const {id, position, room} of lamps) {
    expect(`${id} in ${slopGallery.roomAt(position)?.id}`).toBe(`${id} in ${room}`)
  }
})
test('the rooms only keep lamps that exist, and none of their own', () => {
  for (const room of Object.keys(relations) as Array<GalleryRoomId>) {
    for (const id of visibleLamps(room)) {
      expect(`${room} keeps ${lamp(id).room === room ? 'its own ' : ''}${id}`).toBe(`${room} keeps ${id}`)
    }
  }
})
test('a lamp shines in its own room and in the rooms that keep it', () => {
  expect(slopGallery.lampRooms(lamp('lodge-fire')).toSorted()).toEqual(['corridor', 'fortress', 'lodge'])
  expect(slopGallery.lampRooms(lamp('exhibition-tunnel_red')).toSorted()).toEqual(['exhibition', 'moonfall', 'oculus'])
  expect(slopGallery.lampRooms(lamp('exhibition-west_stairway_door')).toSorted()).toEqual(['exhibition', 'oculus'])
  expect(slopGallery.lampRooms(lamp('fortress-pendant')).toSorted()).toEqual(['fortress', 'lodge', 'oculus'])
})
test('the passages’ lamps hang under the lanterns the fixtures hang from their vaults and ribs', () => {
  const vault = new VaultGeometry(lodgeTunnel, lodgeTunnelTransition.length)
  const timber = TimberGeometry.passage(corridorPassage, lodgeWindowRibCutouts)
  try {
    const [pendant] = lanterns(lodgeTunnel, [vault.shell, vault.ribs], [[0, -0.3]])
    expectNear(lamp('fortress-pendant').position, pendant)
    const [north, middle, south] = lanterns(corridorPassage, [timber.shell, timber.ribs], [[0, -0.3], [4, -0.4], [8, -0.4]], corridorLightSpacing, timber.ribs)
    expectNear(lamp('corridor-lantern_north').position, north)
    expectNear(lamp('corridor-lantern_middle').position, middle)
    expectNear(lamp('corridor-lantern_south').position, south)
  } finally {
    vault.dispose()
    timber.dispose()
  }
})
test('the Lobby’s lamps hang under its chandeliers', () => {
  const lobby = slopGallery.room('lobby')
  const chandeliers = ['north', 'middle', 'south'].map(name => lamp(`lobby-chandelier_${name}`))
  expect(chandeliers.map(({position}) => position[2] - lobby.origin[2])).toEqual([...lobbyChandeliers.offsets])
  expect(chandeliers.every(({position}) => position[1] === lobbyChandeliers.lightY)).toBe(true)
})
test('only Moonfall’s spotlight is a spot, and it casts a real shadow', () => {
  const spots = lamps.filter((value): value is Extract<PlacedLamp, {kind: 'spot'}> => value.kind === 'spot')
  expect(spots.map(({id}) => id)).toEqual(['moonfall-spotlight'])
  expect(spots[0].shadow).toBe(true)
})
