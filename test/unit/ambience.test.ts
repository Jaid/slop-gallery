import type {GalleryRoomId} from '../../src/worlds/gallery/SlopGallery.ts'

import {expect, test} from 'bun:test'

import slopGallery from '../../src/worlds/gallery/index.ts'
import relations, {audibleAmbiences} from '../../src/worlds/gallery/relations.ts'

const ambiences = new Map(slopGallery.rooms.flatMap(({room}) => room.ambience.entries().map(([id, ambience]) => [room.globalId(id), {
  ...ambience,
  room: room.id,
}] as const).toArray()))
test('every ambience emitter goes by the global id of its room’s ambience entry', () => {
  for (const [id, {emitter: Emitter}] of ambiences) {
    const emitter = new Emitter
    expect(emitter.id).toBe(id)
  }
})
test('the rooms only hear ambiences that exist, and none of their own', () => {
  for (const room of Object.keys(relations) as Array<GalleryRoomId>) {
    for (const id of audibleAmbiences(room)) {
      const ambience = ambiences.get(id)
      expect(`${room} hears ${ambience ? '' : 'missing '}${ambience?.room === room ? 'its own ' : ''}${id}`).toBe(`${room} hears ${id}`)
    }
  }
})
test('an ambience sounds in its own room and in the rooms that hear it', () => {
  expect(slopGallery.ambienceRooms('moonfall', 'moonfall-orbital_sculpture').toSorted()).toEqual(['exhibition', 'moonfall'])
  expect(slopGallery.ambienceRooms('lobby', 'lobby-fountain')).toEqual(['lobby'])
})
