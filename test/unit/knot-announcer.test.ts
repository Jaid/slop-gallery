import {expect, test} from 'bun:test'

import {knotAnnouncementPaths, knotAnnouncements} from '../../src/lib/knots/announcements.ts'
import {knotsByNumber} from '../../src/lib/knots/index.ts'
import KnotAnnouncer from '../../src/lib/knots/KnotAnnouncer.ts'

const item = knotsByNumber.get(98)!
test('plays each model and title once, without a key or network generator', async () => {
  const played: Array<string> = []
  const announcer = new KnotAnnouncer({
    resolve: id => `${id}/announce.opus`,
    play: async url => {
      played.push(url)
    },
  })
  await announcer.announce(item)
  await announcer.announce(item)
  await announcer.announce(knotsByNumber.get(101)!)
  await announcer.announce(knotsByNumber.get(101)!)
  expect(played).toEqual(['glm/slug/glm-5.3/announce.opus', 'glm/items/event_horizon/announce.opus', 'glm/items/emberheart/announce.opus'])
  await announcer.announce(knotsByNumber.get(130)!)
  expect(played.at(-2)).toBe('glm/slug/glm-5.3-flash/announce.opus')
})
test('does not mark an interrupted creator as announced or continue stale titles', async () => {
  const played: Array<string> = []
  let finish: () => void = () => {}
  const announcer = new KnotAnnouncer({
    resolve: id => id,
    play: (url, signal) => {
      played.push(url)
      return new Promise<void>((resolve, reject) => {
        finish = resolve
        signal.addEventListener('abort', () => reject(signal.reason), {once: true})
      })
    },
  })
  const first = announcer.announce(item).catch(() => {})
  announcer.stop()
  await first
  expect(announcer.announcedCreators.size).toBe(0)
  const second = announcer.announce(item)
  finish()
  await Promise.resolve()
  expect(played).toHaveLength(3)
  expect(announcer.announcedCreators.size).toBe(1)
  finish()
  await second
})
test('missing recordings stay silent, never triggering paid generation', async () => {
  let count = 0
  const announcer = new KnotAnnouncer({
    resolve: () => {},
    play: async () => {
      count++
    },
  })
  await announcer.announce(item)
  expect(count).toBe(0)
  expect(announcer.announcedCreators.size).toBe(0)
})
test('announcement inventory deduplicates creator versions and keeps safe local paths', () => {
  const paths = knotAnnouncementPaths(item)
  expect(paths.creator).toBe('glm/slug/glm-5.3')
  const entries = knotAnnouncements([item, knotsByNumber.get(101)!, knotsByNumber.get(130)!])
  expect(entries).toHaveLength(5)
  expect(new Set(entries.map(entry => entry.id)).size).toBe(entries.length)
  expect(() => knotAnnouncementPaths({
    ...item,
    author: {
      model: {
        title: 'Bad',
        slug: 'vendor/..',
      },
    },
  })).toThrow()
})
test('completed titles survive announcer remounts within a session, not a fresh session', async () => {
  const played: Array<string> = []
  const audio = {
    resolve: (id: string) => id,
    play: async (url: string) => {
      played.push(url)
    },
  }
  const creators = new Set<string>
  const titles = new Set<string>
  const first = new KnotAnnouncer(audio, creators, titles)
  await first.announce(item)
  expect(first.hasAnnounced(item)).toBe(true)
  const remounted = new KnotAnnouncer(audio, creators, titles)
  await remounted.announce(item)
  expect(played).toHaveLength(2)
  await new KnotAnnouncer(audio).announce(item)
  expect(played).toHaveLength(4)
})
test('interrupted or failed titles remain available until successfully completed', async () => {
  const paths = knotAnnouncementPaths(item)
  const audio = {
    resolve: (id: string) => id,
    play: async (_url: string, signal: AbortSignal) => {
      await new Promise<void>((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), {once: true}))
    },
  }
  const announcer = new KnotAnnouncer(audio, new Set([paths.creator]))
  const pending = announcer.announce(item).catch(() => {})
  announcer.stop()
  await pending
  expect(announcer.hasAnnounced(item)).toBe(false)
  audio.play = async () => {
    throw new Error('Unavailable')
  }
  await expect(announcer.announce(item)).rejects.toThrow('Unavailable')
  expect(announcer.hasAnnounced(item)).toBe(false)
  audio.play = async () => {}
  await announcer.announce(item)
  expect(announcer.hasAnnounced(item)).toBe(true)
})
test('explicit interaction repeats the title without repeating its completed creator', async () => {
  const played: Array<string> = []
  const announcer = new KnotAnnouncer({
    resolve: id => id,
    play: async url => {
      played.push(url)
    },
  })
  await announcer.announce(item)
  await announcer.announce(item, true)
  await announcer.announce(item)
  const paths = knotAnnouncementPaths(item)
  expect(played).toEqual([paths.creator, paths.item, paths.item])
})
test('billboards replay only distinct creator announcements, including mixed-model bays', async () => {
  const played: Array<string> = []
  const announcer = new KnotAnnouncer({
    resolve: id => id,
    play: async url => {
      played.push(url)
    },
  })
  const flash = knotsByNumber.get(130)!
  const items = [item, knotsByNumber.get(101)!, flash]
  const creator = knotAnnouncementPaths(item).creator
  const flashCreator = knotAnnouncementPaths(flash).creator
  await announcer.announceCreators(items)
  await announcer.announceCreators(items)
  expect(played).toEqual([creator, flashCreator, creator, flashCreator])
  expect(announcer.announcedItems.size).toBe(0)
  await announcer.announce(item)
  expect(played.at(-1)).toBe(knotAnnouncementPaths(item).item)
  expect(played).toHaveLength(5)
})
test('a newer billboard announcement cancels an unfinished sequence without marking it complete', async () => {
  const played: Array<string> = []
  const announcer = new KnotAnnouncer({
    resolve: id => id,
    play: async (url, signal) => {
      played.push(url)
      await new Promise<void>((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), {once: true}))
    },
  })
  const flash = knotsByNumber.get(130)!
  const first = announcer.announceCreators([item, flash]).catch(() => {})
  const second = announcer.announceCreators([flash]).catch(() => {})
  await first
  expect(played).toEqual([knotAnnouncementPaths(item).creator, knotAnnouncementPaths(flash).creator])
  expect(announcer.announcedCreators.size).toBe(0)
  announcer.stop()
  await second
  expect(announcer.announcedCreators.size).toBe(0)
})
test('missing billboard recordings do not mark creators as announced', async () => {
  const announcer = new KnotAnnouncer({
    resolve: () => {},
    play: async () => {
      throw new Error('Should not play')
    },
  })
  await announcer.announceCreators([item])
  expect(announcer.announcedCreators.size).toBe(0)
})
