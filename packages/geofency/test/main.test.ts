import type {BoxInput, Fence, GeofenceSessionOptions, Position} from '../src/main.ts'

import {describe, expect, test} from 'bun:test'

import Geofences, {BeamBox, Box, boxInputSchema, ClosedBox, createBox, Geofence, GeofenceSession, SkyBox, VoidBox} from '../src/main.ts'

const beam = {
  x: 0,
  z: 0,
  x2: 4,
  z2: 2,
}
const record = <Id>(session: GeofenceSession<Id>) => {
  const events: Array<Array<unknown>> = []
  session.on('enter', id => events.push(['enter', id]))
  session.on('leave', id => events.push(['leave', id]))
  session.on('change', (match, previous) => events.push(['change', match, previous]))
  return events
}
const create = (options?: GeofenceSessionOptions) => new GeofenceSession(new Geofences([
  ['room', new Geofence([{
    ...beam,
    y: 0,
    y2: 3,
  }])],
  ['sky', new Geofence([{
    ...beam,
    floor: 2,
  }])],
]), options)
describe('Box.contains', () => {
  const cases: Array<[string, BoxInput, Position, boolean]> = [
    ['beamBox inside', beam, [2, 0, 1], true],
    ['beamBox at any height', beam, [2, -1000, 1], true],
    ['beamBox on an edge', beam, [4, 7, 2], true],
    ['beamBox on a corner', beam, [0, 7, 0], true],
    ['beamBox beside it on x', beam, [4.001, 0, 1], false],
    ['beamBox beside it on z', beam, [2, 0, -0.001], false],
    ['beamBox with NaN in the position', beam, [Number.NaN, 0, 1], false],
    ['skyBox above the floor', {
      ...beam,
      floor: 3,
    }, [2, 100, 1], true],
    ['skyBox exactly on the floor', {
      ...beam,
      floor: 3,
    }, [2, 3, 1], true],
    ['skyBox below the floor', {
      ...beam,
      floor: 3,
    }, [2, 2.999, 1], false],
    ['skyBox above the floor but outside the beam', {
      ...beam,
      floor: 3,
    }, [5, 100, 1], false],
    ['voidBox below the ceiling', {
      ...beam,
      ceiling: 3,
    }, [2, -100, 1], true],
    ['voidBox exactly on the ceiling', {
      ...beam,
      ceiling: 3,
    }, [2, 3, 1], true],
    ['voidBox above the ceiling', {
      ...beam,
      ceiling: 3,
    }, [2, 3.001, 1], false],
    ['voidBox below the ceiling but outside the beam', {
      ...beam,
      ceiling: 3,
    }, [2, -100, 3], false],
    ['closedBox inside', {
      ...beam,
      y: 1,
      y2: 3,
    }, [2, 2, 1], true],
    ['closedBox on the bottom face', {
      ...beam,
      y: 1,
      y2: 3,
    }, [2, 1, 1], true],
    ['closedBox on the top face', {
      ...beam,
      y: 1,
      y2: 3,
    }, [2, 3, 1], true],
    ['closedBox on a corner', {
      ...beam,
      y: 1,
      y2: 3,
    }, [4, 3, 2], true],
    ['closedBox below it', {
      ...beam,
      y: 1,
      y2: 3,
    }, [2, 0.999, 1], false],
    ['closedBox above it', {
      ...beam,
      y: 1,
      y2: 3,
    }, [2, 3.001, 1], false],
    ['closedBox beside it', {
      ...beam,
      y: 1,
      y2: 3,
    }, [-1, 2, 1], false],
    ['flat closedBox on its plane', {
      ...beam,
      y: 1,
      y2: 1,
    }, [2, 1, 1], true],
    ['swapped beamBox inside', {
      x: 4,
      z: 2,
      x2: 0,
      z2: 0,
    }, [2, 0, 1], true],
    ['swapped closedBox inside', {
      x: 4,
      z: 2,
      x2: 0,
      z2: 0,
      y: 3,
      y2: 1,
    }, [2, 2, 1], true],
    ['swapped closedBox above it', {
      x: 4,
      z: 2,
      x2: 0,
      z2: 0,
      y: 3,
      y2: 1,
    }, [2, 3.001, 1], false],
  ]
  test.each(cases)('%s', (_, input, position, expected) => {
    expect(createBox(input).contains(position)).toBe(expected)
  })
})
describe('createBox', () => {
  test('picks the class by the keys', () => {
    expect(createBox(beam)).toBeInstanceOf(BeamBox)
    expect(createBox({
      ...beam,
      floor: 1,
    })).toBeInstanceOf(SkyBox)
    expect(createBox({
      ...beam,
      ceiling: 1,
    })).toBeInstanceOf(VoidBox)
    expect(createBox({
      ...beam,
      y: 1,
      y2: 2,
    })).toBeInstanceOf(ClosedBox)
    expect(createBox(beam)).toBeInstanceOf(Box)
  })
  test('keeps boxes as they are', () => {
    const box = new SkyBox({
      ...beam,
      floor: 1,
    })
    expect(createBox(box)).toBe(box)
  })
  test('sorts the values of every axis', () => {
    expect(createBox({
      x: 4,
      z: 5,
      x2: 0,
      z2: 2,
      y: 3,
      y2: 1,
    })).toEqual(new ClosedBox({
      x: 0,
      z: 2,
      x2: 4,
      z2: 5,
      y: 1,
      y2: 3,
    }))
    expect(createBox({
      x: 4,
      z: 5,
      x2: 0,
      z2: 2,
      floor: 7,
    })).toEqual(new SkyBox({
      x: 0,
      z: 2,
      x2: 4,
      z2: 5,
      floor: 7,
    }))
    expect(createBox({
      x: 4,
      z: 5,
      x2: 0,
      z2: 2,
      ceiling: -7,
    })).toEqual(new VoidBox({
      x: 0,
      z: 2,
      x2: 4,
      z2: 5,
      ceiling: -7,
    }))
    expect(createBox({
      x: 4,
      z: 5,
      x2: 0,
      z2: 2,
    })).toEqual(new BeamBox({
      x: 0,
      z: 2,
      x2: 4,
      z2: 5,
    }))
  })
  test('rejects mixed, incomplete and unknown keys', () => {
    expect(() => createBox({
      ...beam,
      floor: 1,
      ceiling: 2,
    })).toThrow()
    expect(() => createBox({
      ...beam,
      y: 1,
    })).toThrow()
    expect(() => createBox({
      ...beam,
      y2: 1,
    })).toThrow()
    expect(() => createBox({
      x: 0,
      z: 0,
      x2: 1,
    } as unknown as BoxInput)).toThrow()
    expect(() => createBox({
      ...beam,
      w: 1,
    } as unknown as BoxInput)).toThrow()
  })
  test('rejects non-finite values', () => {
    expect(() => createBox({
      ...beam,
      x: Number.NaN,
    })).toThrow()
    expect(() => createBox({
      ...beam,
      floor: Number.NEGATIVE_INFINITY,
    })).toThrow()
    expect(() => new ClosedBox({
      ...beam,
      y: 0,
      y2: Number.POSITIVE_INFINITY,
    })).toThrow()
  })
  test('round-trips through JSON', () => {
    const box = createBox({
      x: 4,
      z: 5,
      x2: 0,
      z2: 2,
      y: 3,
      y2: 1,
    })
    const json = JSON.stringify(box)
    expect(json).toBe('{"x":0,"x2":4,"z":2,"z2":5,"y":1,"y2":3}')
    const input = boxInputSchema.parse(JSON.parse(json))
    expect(createBox(input)).toEqual(box)
    expect(createBox(input)).toBeInstanceOf(ClosedBox)
  })
})
describe('Box.translate', () => {
  test('moves every kind of box and keeps its class', () => {
    const boxes = [beam, {
      ...beam,
      floor: 1,
    }, {
      ...beam,
      ceiling: 1,
    }, {
      ...beam,
      y: 1,
      y2: 2,
    }].map(input => createBox(input))
    const moved = boxes.map(box => box.translate([10, 5, -10]))
    expect(moved.map(box => box.constructor)).toEqual([BeamBox, SkyBox, VoidBox, ClosedBox])
    const footprint = {
      x: 10,
      z: -10,
      x2: 14,
      z2: -8,
    }
    expect(moved).toEqual([
      new BeamBox(footprint),
      new SkyBox({
        ...footprint,
        floor: 6,
      }),
      new VoidBox({
        ...footprint,
        ceiling: 6,
      }),
      new ClosedBox({
        ...footprint,
        y: 6,
        y2: 7,
      }),
    ])
  })
  test('rejects non-finite offsets', () => {
    const box = new BeamBox(beam)
    expect(() => box.translate([Number.NaN, 0, 0])).toThrow()
  })
})
describe('Geofence', () => {
  test('turns plain data into boxes and keeps given boxes', () => {
    const sky = new SkyBox({
      ...beam,
      floor: 1,
    })
    const geofence = new Geofence([beam, sky, {
      ...beam,
      ceiling: 1,
    }, {
      ...beam,
      y: 1,
      y2: 2,
    }])
    expect(geofence.boxes.map(box => box.constructor)).toEqual([BeamBox, SkyBox, VoidBox, ClosedBox])
    expect(geofence.boxes[1]).toBe(sky)
    expect(Object.isFrozen(geofence.boxes)).toBe(true)
  })
  test('contains what any of its boxes contains', () => {
    const geofence = new Geofence([{
      ...beam,
      y: 0,
      y2: 1,
    }, {
      x: 10,
      z: 10,
      x2: 12,
      z2: 12,
      floor: 5,
    }])
    expect(geofence.contains([1, 0.5, 1])).toBe(true)
    expect(geofence.contains([11, 50, 11])).toBe(true)
    expect(geofence.contains([11, 0, 11])).toBe(false)
    expect(geofence.contains([6, 0.5, 1])).toBe(false)
  })
  test('rejects no boxes', () => {
    expect(() => new Geofence([])).toThrow()
  })
  test('rejects invalid boxes', () => {
    expect(() => new Geofence([{
      ...beam,
      x: Number.NaN,
    }])).toThrow()
  })
})
describe('Geofence.translate', () => {
  const geofence = new Geofence([beam, {
    ...beam,
    floor: 1,
  }, {
    ...beam,
    ceiling: 1,
  }, {
    ...beam,
    y: 1,
    y2: 2,
  }])
  const moved = geofence.translate([10, 5, -10])
  test('moves every box', () => {
    expect(moved.boxes).toEqual([
      new BeamBox({
        x: 10,
        z: -10,
        x2: 14,
        z2: -8,
      }),
      new SkyBox({
        x: 10,
        z: -10,
        x2: 14,
        z2: -8,
        floor: 6,
      }),
      new VoidBox({
        x: 10,
        z: -10,
        x2: 14,
        z2: -8,
        ceiling: 6,
      }),
      new ClosedBox({
        x: 10,
        z: -10,
        x2: 14,
        z2: -8,
        y: 6,
        y2: 7,
      }),
    ])
  })
  test('returns a new geofence and leaves the original alone', () => {
    expect(moved).toBeInstanceOf(Geofence)
    expect(moved).not.toBe(geofence)
    expect(geofence.boxes[0]).toEqual(new BeamBox(beam))
  })
  test('contains what the original contains, moved', () => {
    expect(geofence.contains([1, 1.5, 1])).toBe(true)
    expect(moved.contains([11, 6.5, -9])).toBe(true)
    expect(moved.contains([1, 1.5, 1])).toBe(false)
  })
})
describe('Geofences', () => {
  const geofences = new Geofences([
    ['ground', new Geofence([{
      ...beam,
      y: 0,
      y2: 3,
    }])],
    ['sky', new Geofence([{
      ...beam,
      floor: 2,
    }])],
    ['elsewhere', new Geofence([{
      x: 10,
      z: 10,
      x2: 12,
      z2: 12,
    }])],
  ])
  test('is a Map', () => {
    expect(geofences).toBeInstanceOf(Map)
    expect(geofences.size).toBe(3)
  })
  test('getMatch returns the first matching id', () => {
    expect(geofences.getMatch([1, 2.5, 1])).toBe('ground')
    expect(geofences.getMatch([1, 10, 1])).toBe('sky')
    expect(geofences.getMatch([11, 0, 11])).toBe('elsewhere')
  })
  test('getMatch returns null without a match', () => {
    expect(geofences.getMatch([100, 0, 100])).toBeNull()
    const empty = new Geofences
    expect(empty.getMatch([0, 0, 0])).toBeNull()
  })
  test('getMatches returns every matching id in insertion order', () => {
    expect(geofences.getMatches([1, 2.5, 1])).toEqual(['ground', 'sky'])
    expect(geofences.getMatches([1, 1, 1])).toEqual(['ground'])
    expect(geofences.getMatches([100, 0, 100])).toEqual([])
  })
  test('keeps literal ids', () => {
    const typed = new Geofences<'a' | 'b'>([['a', new Geofence([beam])]])
    const match: 'a' | 'b' | null = typed.getMatch([1, 0, 1])
    expect(match).toBe('a')
  })
  test('takes single boxes as fences', () => {
    const boxes = new Geofences<string, Box>([
      ['low', new ClosedBox({
        ...beam,
        y: 0,
        y2: 1,
      })],
      ['high', new SkyBox({
        ...beam,
        floor: 1,
      })],
    ])
    expect(boxes.getMatch([1, 0.5, 1])).toBe('low')
    expect(boxes.getMatches([1, 1, 1])).toEqual(['low', 'high'])
  })
  test('takes any fence and keeps its type', () => {
    class Sphere {
      constructor(readonly radius: number) {}
      contains([x, y, z]: Position) {
        return Math.hypot(x, y, z) <= this.radius
      }
    }
    const fences = new Geofences<string, Fence>([
      ['sphere', new Sphere(1)],
      ['everywhere', {contains: () => true}],
    ])
    expect(fences.getMatch([0, 1, 0])).toBe('sphere')
    expect(fences.getMatch([0, 2, 0])).toBe('everywhere')
    expect(fences.getMatches([0, 0.5, 0])).toEqual(['sphere', 'everywhere'])
    const spheres = new Geofences([['sphere', new Sphere(2)]])
    expect(spheres.get('sphere')?.radius).toBe(2)
  })
})
describe('GeofenceSession', () => {
  test('defaults to a single sticky match', () => {
    const session = create()
    expect(session.multiple).toBe(false)
    expect(session.announceEmpty).toBe(false)
  })
  test('starts outside of every fence', () => {
    const session = create()
    expect(session.match).toBeNull()
    expect([...session.matches]).toEqual([])
  })
  test('listeners see the new state', () => {
    const session = create()
    const seen: Array<unknown> = []
    session.on('change', () => seen.push(session.match, [...session.matches]))
    session.update([1, 1, 1])
    expect(seen).toEqual(['room', ['room']])
  })
})
describe('GeofenceSession, single', () => {
  test('only follows the first match', () => {
    const session = create()
    const events = record(session)
    expect(session.update([1, 1, 1])).toBe('room')
    expect(events.splice(0)).toEqual([['enter', 'room'], ['change', 'room', null]])
    // also in the sky fence, but the room fence comes first
    expect(session.update([1, 2.5, 1])).toBe('room')
    expect([...session.matches]).toEqual(['room'])
    expect(events.splice(0)).toEqual([])
    expect(session.update([1, 10, 1])).toBe('sky')
    expect(events.splice(0)).toEqual([['leave', 'room'], ['enter', 'sky'], ['change', 'sky', 'room']])
  })
  test('keeps its match outside of every fence', () => {
    const session = create()
    session.update([1, 1, 1])
    const events = record(session)
    expect(session.update([100, 0, 100])).toBe('room')
    expect(session.match).toBe('room')
    expect([...session.matches]).toEqual(['room'])
    expect(session.update([1, 10, 1])).toBe('sky')
    expect(events).toEqual([['leave', 'room'], ['enter', 'sky'], ['change', 'sky', 'room']])
  })
  test('announces leaving every fence with announceEmpty', () => {
    const session = create({announceEmpty: true})
    session.update([1, 1, 1])
    const events = record(session)
    expect(session.update([100, 0, 100])).toBeNull()
    expect([...session.matches]).toEqual([])
    session.update([100, 0, 101])
    expect(session.update([1, 1, 1])).toBe('room')
    expect(events).toEqual([['leave', 'room'], ['change', null, 'room'], ['enter', 'room'], ['change', 'room', null]])
  })
  test('keeps a removed fence’s id until another fence matches', () => {
    const session = create()
    session.update([1, 1, 1])
    const events = record(session)
    session.geofences.delete('room')
    expect(session.update([1, 1, 1])).toBe('room')
    expect(session.update([1, 2.5, 1])).toBe('sky')
    expect(events).toEqual([['leave', 'room'], ['enter', 'sky'], ['change', 'sky', 'room']])
  })
})
describe('GeofenceSession, multiple', () => {
  test('follows every match', () => {
    const session = create({
      multiple: true,
      announceEmpty: true,
    })
    const events = record(session)
    expect(session.update([1, 1, 1])).toBe('room')
    expect(events.splice(0)).toEqual([['enter', 'room'], ['change', 'room', null]])
    session.update([1, 2.5, 1])
    expect(events.splice(0)).toEqual([['enter', 'sky']])
    expect([...session.matches]).toEqual(['room', 'sky'])
    session.update([1, 10, 1])
    expect(events.splice(0)).toEqual([['leave', 'room'], ['change', 'sky', 'room']])
    session.update([100, 10, 1])
    expect(events.splice(0)).toEqual([['leave', 'sky'], ['change', null, 'sky']])
  })
  test('stays silent while nothing changes', () => {
    const session = create({
      multiple: true,
      announceEmpty: true,
    })
    session.update([1, 1, 1])
    const events = record(session)
    session.update([2, 1.5, 1])
    session.update([100, 0, 100])
    session.update([100, 0, 101])
    expect(events).toEqual([['leave', 'room'], ['change', null, 'room']])
  })
  test('keeps its last matches outside of every fence without announceEmpty', () => {
    const session = create({multiple: true})
    session.update([1, 2.5, 1])
    const events = record(session)
    session.update([1, 10, 1])
    expect(events.splice(0)).toEqual([['leave', 'room'], ['change', 'sky', 'room']])
    expect(session.update([100, 0, 100])).toBe('sky')
    expect([...session.matches]).toEqual(['sky'])
    expect(events).toEqual([])
  })
  test('keeps every match when jumping out of all of them at once without announceEmpty', () => {
    const session = create({multiple: true})
    session.update([1, 2.5, 1])
    const events = record(session)
    session.update([100, 0, 100])
    expect([...session.matches]).toEqual(['room', 'sky'])
    expect(events).toEqual([])
  })
  test('notices fences removed from its geofences', () => {
    const session = create({
      multiple: true,
      announceEmpty: true,
    })
    session.update([1, 1, 1])
    const events = record(session)
    session.geofences.delete('room')
    session.update([1, 1, 1])
    expect(events).toEqual([['leave', 'room'], ['change', null, 'room']])
  })
})
