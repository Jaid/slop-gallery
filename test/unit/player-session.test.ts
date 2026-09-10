import {afterEach, beforeEach, describe, expect, test} from 'bun:test'

import {resetGallery} from '../../src/lib/gallery/actions.ts'
import {cabin, cabinStairs, cabinWindow} from '../../src/lib/gallery/cabin.ts'
import {validateDocument} from '../../src/lib/gallery/GalleryRepository.ts'
import {PlayerSession, playerSession, playerSpawn, validatePlayerPose} from '../../src/lib/gallery/PlayerSession.ts'
import {createDocument, restoreDocument, undo, useGallery} from '../../src/lib/gallery/store.ts'

const original = createDocument()
const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
let storage: Map<string, string>
beforeEach(() => {
  storage = new Map
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  })
  restoreDocument(original)
  useGallery.setState({sound: false})
})
afterEach(() => {
  restoreDocument(original)
  if (storageDescriptor) {
    Object.defineProperty(globalThis, 'localStorage', storageDescriptor)
  } else {
    Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
describe('player save state', () => {
  test('new and legacy collections spawn on the centerline facing the fountain', () => {
    expect(playerSpawn).toEqual({
      position: [0, 0.05, -9],
      yaw: 0,
    })
    const {player, ...legacy} = original
    expect(player).toBeDefined()
    expect(validateDocument(legacy).player).toEqual(playerSpawn)
  })
  test('invalid or obsolete positions do not prevent artwork recovery', () => {
    for (const player of [
      null, {}, {
        position: [0, 0, -9],
        yaw: Number.NaN,
      }, {
        position: [0, Infinity, 0],
        yaw: 0,
      }, {
        position: ['0', 0, -9],
        yaw: 0,
      }, {
        position: [0, 0],
        yaw: 0,
      }, {
        position: [400, 0, 0],
        yaw: 0,
      }, {
        position: [-25, -4.9, -20],
        yaw: 0,
      },
    ]) {
      expect(validatePlayerPose(player)).toBeNull()
      const saved = validateDocument({
        ...original,
        player,
      })
      expect(saved.player).toEqual(playerSpawn)
      expect(saved.portraits).toHaveLength(original.portraits.length)
    }
  })
  test('room, tunnel and stair poses round-trip without camera-height offsets or shared arrays', () => {
    const tread = cabinStairs.blocks[12]!
    for (const position of [[0, 0.02, -9], [-25, cabin.floorY + 0.02, -31], [-33, cabin.floorY + 0.02, -20], [(cabinWindow.roomX + cabinWindow.tunnelX) / 2, cabinWindow.bottom + 0.02, cabinWindow.z], [tread.position[0], tread.top + 0.02, tread.position[2]]] as const) {
      const pose = {
        position: [...position] as [number, number, number],
        yaw: 1.23,
      }
      playerSession.capture(pose)
      const saved = validateDocument(createDocument())
      expect(saved.player?.position).toEqual(pose.position)
      expect(saved.player?.yaw).toBeCloseTo(pose.yaw)
      restoreDocument(saved)
      saved.player!.position[0] = 900
      expect(playerSession.snapshot().position).toEqual(pose.position)
    }
  })
  test('movement stays out of React updates and artwork undo, while Reset returns home', () => {
    const pose = {
      position: [-25, -4.98, -31] as [number, number, number],
      yaw: -0.7,
    }
    let updates = 0
    const unsubscribe = useGallery.subscribe(() => updates++)
    playerSession.capture(pose)
    expect(updates).toBe(0)
    unsubscribe()
    useGallery.getState().commit([...useGallery.getState().portraits])
    undo()
    expect(playerSession.snapshot().position).toEqual(pose.position)
    resetGallery()
    expect(playerSession.snapshot()).toEqual(playerSpawn)
    undo()
    expect(playerSession.snapshot()).toEqual(playerSpawn)
  })
  test('refresh takes a newer small checkpoint but never an older or corrupt one', () => {
    const pose = {
      position: [-33, -4.98, -20] as [number, number, number],
      yaw: 0.4,
    }
    const live = new PlayerSession
    live.capture(pose)
    expect(live.checkpoint('2026-09-09T12:00:01Z')).toBe(true)
    const refreshed = new PlayerSession
    refreshed.resume('2026-09-09T12:00:00Z')
    expect(refreshed.snapshot().position).toEqual(pose.position)
    const newerCollection = new PlayerSession
    newerCollection.resume('2026-09-09T12:00:02Z')
    expect(newerCollection.snapshot()).toEqual(playerSpawn)
    storage.set('slop-gallery-player', '{bad json')
    refreshed.resume('')
    expect(refreshed.snapshot().position).toEqual(pose.position)
    storage.set('slop-gallery-player', JSON.stringify({
      player: {
        position: [900, 900, 900],
        yaw: 0,
      },
      savedAt: '2027-01-01',
    }))
    refreshed.resume('')
    expect(refreshed.snapshot().position).toEqual(pose.position)
  })
  test('blocked storage, equivalent yaw and detached snapshots remain safe', () => {
    const session = new PlayerSession
    session.capture({
      position: [0, 0.05, -9],
      yaw: Math.PI * 2,
    })
    expect(session.revision).toBe(0)
    session.snapshot().position[0] = 900
    expect(session.snapshot()).toEqual(playerSpawn)
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('Blocked')
      },
    })
    expect(session.checkpoint()).toBe(false)
    expect(() => session.resume('')).not.toThrow()
  })
})
