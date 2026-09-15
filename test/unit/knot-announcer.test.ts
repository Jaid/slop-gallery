import {expect, test} from 'bun:test'

import {knotAnnouncementPaths, knotAnnouncements, knotCandidateAnnouncementPath} from '../../src/lib/knots/announcements.ts'
import {knotCandidates, knotsById} from '../../src/lib/knots/index.ts'
import KnotAnnouncer from '../../src/lib/knots/KnotAnnouncer.ts'

const item = knotsById.get('glm/event_horizon')!
const flash = knotsById.get('glm_flash/ember_cortex')!
const glm = knotCandidates.find(candidate => candidate.data.id === 'glm')!
const glmFlash = knotCandidates.find(candidate => candidate.data.id === 'glm_flash')!
test('plays each model introduction and knot title once', async () => {
  const played: Array<string> = []
  const announcer = new KnotAnnouncer({
    resolve: id => `${id}/announce.opus`,
    play: async url => {
      played.push(url)
    },
  })
  await announcer.announce(item)
  await announcer.announce(item)
  await announcer.announce(knotsById.get('glm/emberheart')!)
  await announcer.announce(knotsById.get('glm/emberheart')!)
  expect(played).toEqual(['glm/slug/glm-5.3/announce.opus', 'glm/items/event_horizon/announce.opus', 'glm/items/emberheart/announce.opus'])
  await announcer.announce(flash)
  expect(played.at(-2)).toBe('glm_flash/slug/glm-5.3-flash/announce.opus')
})
test('does not mark an interrupted model as announced or continue stale titles', async () => {
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
  expect(announcer.announcedModels.size).toBe(0)
  const second = announcer.announce(item)
  finish()
  await Promise.resolve()
  expect(played).toHaveLength(3)
  expect(announcer.announcedModels.size).toBe(1)
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
  expect(announcer.announcedModels.size).toBe(0)
})
test('announcement inventory includes candidates, models and knot titles with safe local paths', () => {
  const paths = knotAnnouncementPaths(item)
  expect(paths.model).toBe('glm/slug/glm-5.3')
  expect(knotCandidateAnnouncementPath(glm.data)).toBe('glm/candidate')
  const entries = knotAnnouncements([
    {
      data: glm.data,
      items: [item, knotsById.get('glm/emberheart')!],
    },
    {
      data: glmFlash.data,
      items: [flash],
    },
  ])
  expect(entries.map(entry => entry.id)).toEqual([
    'glm/candidate',
    'glm/slug/glm-5.3',
    'glm/items/event_horizon',
    'glm/items/emberheart',
    'glm_flash/candidate',
    'glm_flash/slug/glm-5.3-flash',
    'glm_flash/items/ember_cortex',
  ])
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
test('completed model and title state survives announcer remounts within a session', async () => {
  const played: Array<string> = []
  const audio = {
    resolve: (id: string) => id,
    play: async (url: string) => {
      played.push(url)
    },
  }
  const models = new Set<string>const titles = new Set<string>const first = new KnotAnnouncer(audio, models, titles)
  await first.announce(item)
  expect(first.hasAnnounced(item)).toBe(true)
  expect(first.hasAnnouncedModel(item)).toBe(true)
  const remounted = new KnotAnnouncer(audio, models, titles)
  await remounted.announce(item)
  expect(played).toHaveLength(2)
  await new KnotAnnouncer(audio).announce(item)
  expect(played).toHaveLength(4)
})
test('interrupted or failed knot titles remain available until successfully completed', async () => {
  const paths = knotAnnouncementPaths(item)
  const audio = {
    resolve: (id: string) => id,
    play: async (_url: string, signal: AbortSignal) => {
      await new Promise<void>((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), {once: true}))
    },
  }
  const announcer = new KnotAnnouncer(audio, new Set([paths.model]))
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
test('explicit knot interaction repeats its title without repeating its completed model introduction', async () => {
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
  expect(played).toEqual([paths.model, paths.item, paths.item])
})
test('knot interaction introduces an unseen author model once without playing the knot title', async () => {
  const played: Array<string> = []
  const announcer = new KnotAnnouncer({
    resolve: id => id,
    play: async url => {
      played.push(url)
    },
  })
  await announcer.announceModel(item)
  await announcer.announceModel(item)
  expect(played).toEqual([knotAnnouncementPaths(item).model])
  expect(announcer.hasAnnouncedModel(item)).toBe(true)
  expect(announcer.hasAnnounced(item)).toBe(false)
})
test('candidate interaction replays only the candidate and does not introduce its models', async () => {
  const played: Array<string> = []
  const announcer = new KnotAnnouncer({
    resolve: id => id,
    play: async url => {
      played.push(url)
    },
  })
  await announcer.announceCandidate(glm.data)
  await announcer.announceCandidate(glm.data)
  expect(played).toEqual(['glm/candidate', 'glm/candidate'])
  expect(announcer.announcedModels.size).toBe(0)
  expect(announcer.announcedItems.size).toBe(0)
  await announcer.announce(item)
  expect(played.slice(-2)).toEqual([knotAnnouncementPaths(item).model, knotAnnouncementPaths(item).item])
})
test('a newer candidate announcement cancels an unfinished one without changing model state', async () => {
  const played: Array<string> = []
  const announcer = new KnotAnnouncer({
    resolve: id => id,
    play: async (url, signal) => {
      played.push(url)
      await new Promise<void>((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), {once: true}))
    },
  })
  const first = announcer.announceCandidate(glm.data).catch(() => {})
  const second = announcer.announceCandidate(glmFlash.data).catch(() => {})
  await first
  expect(played).toEqual(['glm/candidate', 'glm_flash/candidate'])
  expect(announcer.announcedModels.size).toBe(0)
  announcer.stop()
  await second
})
test('missing candidate recordings do not affect model announcement state', async () => {
  const announcer = new KnotAnnouncer({
    resolve: () => {},
    play: async () => {
      throw new Error('Should not play')
    },
  })
  await announcer.announceCandidate(glm.data)
  expect(announcer.announcedModels.size).toBe(0)
})
