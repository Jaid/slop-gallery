import {expect, test} from 'bun:test'

import Geofences, {Geofence} from 'geofency'

import GeofenceTelemetry from '../../src/lib/telemetry/GeofenceTelemetry.ts'
import SlopGalleryTelemetry from '../../src/lib/telemetry/SlopGalleryTelemetry.ts'

const decoder = new TextDecoder
const createTelemetry = () => {
  const bodies: Array<string> = []
  const telemetry = new SlopGalleryTelemetry({
    endpoints: {logs: 'https://logs.test/insert/jsonline?_stream_fields=service.name'},
    baseUrl: 'http://gallery.test/',
    interval: false,
    fetch: async (_url, init) => {
      bodies.push(decoder.decode(init.body as Uint8Array))
      return new Response(null, {status: 200})
    },
  })
  const read = async () => {
    await telemetry.flush()
    return bodies.flatMap(body => body.trim().split('\n')).filter(Boolean).map(line => JSON.parse(line) as Record<string, unknown>)
  }
  return {
    telemetry,
    read,
  }
}
// Two rooms with a gap between them, and a balcony overlapping the east one.
const geofences = new Geofences([
  ['west', new Geofence([{
    x: 0,
    z: 0,
    x2: 4,
    z2: 4,
  }])],
  ['east', new Geofence([{
    x: 6,
    z: 0,
    x2: 10,
    z2: 4,
  }])],
  ['balcony', new Geofence([{
    x: 8,
    z: 0,
    x2: 10,
    z2: 4,
    floor: 3,
  }])],
])
test('every fence entered and left is logged on its own, with the position and the title', async () => {
  const {telemetry, read} = createTelemetry()
  const fences = new GeofenceTelemetry(telemetry, geofences, [2, 0, 2], id => (id === 'west' ? 'West Wing' : undefined))
  fences.update([3, 0, 2])
  fences.update([5, 0, 2])
  fences.update([7, 0, 2])
  fences.update([9, 4, 2.0004])
  fences.update([9, 0, 2])
  fences.dispose()
  fences.update([2, 0, 2])
  const records = await read()
  expect(records.map(record => [record['event.name'], record['geofence.id'], record._msg])).toEqual([
    ['gallery.geofence.left', 'west', 'Left geofence: West Wing'],
    ['gallery.geofence.entered', 'east', 'Entered geofence: east'],
    ['gallery.geofence.entered', 'balcony', 'Entered geofence: balcony'],
    ['gallery.geofence.left', 'balcony', 'Left geofence: balcony'],
  ])
  expect(records[2]).toMatchObject({
    'position.x': 9,
    'position.y': 4,
    'position.z': 2,
  })
  await telemetry.shutdown()
})
test('the fences the first position lies in count silently', async () => {
  const {telemetry, read} = createTelemetry()
  const fences = new GeofenceTelemetry(telemetry, geofences, [9, 4, 2])
  fences.update([9, 4, 2])
  fences.update([9, 0, 2])
  const records = await read()
  expect(records.map(record => [record['event.name'], record['geofence.id']])).toEqual([['gallery.geofence.left', 'balcony']])
  await telemetry.shutdown()
})
