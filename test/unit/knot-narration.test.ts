import {expect, test} from 'bun:test'

import {knotCandidates, knotsById} from 'knot-materials'
import {knotAnnouncementPaths, knotAnnouncements, knotCandidateAnnouncementPath} from 'knot-materials/announcements.ts'
import {Narrator} from 'use-narrator/core'

import {FakePlayback, flush} from '../../packages/use-narrator/packages/use-audio-queue/test/helpers.ts'
import KnotNarration from '../../src/lib/audio/KnotNarration.ts'

const item = knotsById.get('singularity_crown')!
const flash = knotsById.get('ember_cortex')!
const glm = knotCandidates.find(candidate => candidate.data.id === 'glm')!
const glmFlash = knotCandidates.find(candidate => candidate.data.id === 'glm_flash')!
const setup = (resolve: (id: string) => string | undefined = id => id) => {
  const players: Array<FakePlayback> = []
  const narrator = new Narrator({createAudio: reference => {
    const player = new FakePlayback(String(reference))
    players.push(player)
    return player
  }, createSpeech: () => {
    throw new Error('Knot narration must not generate speech.')
  }})
  const announcements = new KnotNarration(narrator, resolve)
  const drain = async () => {
    await flush()
    for (let i = 0; !narrator.getSnapshot().idle && i < 20; i++) {
      players.at(-1)!.end()
      await flush()
    }
    expect(narrator.getSnapshot().idle).toBe(true)
  }
  return {
    narrator,
    announcements,
    players,
    drain,
  }
}
test('announcement inventory includes candidates, models and knot titles with safe local paths', () => {
  const paths = knotAnnouncementPaths(item)
  expect(paths.model).toBe('candidates/glm/slug/glm-5.3')
  expect(knotCandidateAnnouncementPath(glm.data)).toBe('candidates/glm/candidate')
  const entries = knotAnnouncements([
    {
      data: glm.data,
      items: [item, knotsById.get('emberheart')!],
    },
    {
      data: glmFlash.data,
      items: [flash],
    },
  ])
  expect(entries.map(entry => entry.id)).toEqual([
    'candidates/glm/candidate',
    'candidates/glm/slug/glm-5.3',
    'entries/singularity_crown',
    'entries/emberheart',
    'candidates/glm_flash/candidate',
    'candidates/glm_flash/slug/glm-5.3-flash',
    'entries/ember_cortex',
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
test('bursts share one pending model introduction and queue all unseen knot titles', async () => {
  const {announcements, players, drain} = setup()
  announcements.enqueue(item, {id: item.id})
  announcements.enqueue(item, {id: item.id})
  announcements.enqueue(knotsById.get('emberheart')!, {id: 'emberheart'})
  await drain()
  expect(players.map(p => p.name)).toEqual(['candidates/glm/slug/glm-5.3', 'entries/singularity_crown', 'entries/emberheart'])
  announcements.enqueue(item, {id: item.id})
  await drain()
  expect(players).toHaveLength(3)
  announcements.enqueue(flash, {id: flash.id})
  await drain()
  expect(players.at(-2)!.name).toBe('candidates/glm_flash/slug/glm-5.3-flash')
})
test('model/item completion survives producer remounts but explicit replay repeats only the title', async () => {
  const {narrator, announcements, players, drain} = setup()
  announcements.enqueue(item, {id: item.id})
  await drain()
  const remounted = new KnotNarration(narrator, id => id)
  remounted.enqueue(item, {id: item.id})
  await drain()
  expect(players).toHaveLength(2)
  remounted.enqueue(item, {
    id: item.id,
    repeat: true,
  })
  await drain()
  expect(players.map(p => p.name)).toEqual([knotAnnouncementPaths(item).model, knotAnnouncementPaths(item).item, knotAnnouncementPaths(item).item])
})
test('cancelled introductions and titles are not marked heard and can be retried', async () => {
  const {narrator, announcements, players, drain} = setup()
  const owner = new AbortController
  const handles = announcements.enqueue(item, {
    id: item.id,
    signal: owner.signal,
  })
  await flush()
  owner.abort()
  for (const handle of handles) {
    expect((await handle.finished).status).toBe('cancelled')
  }
  expect(narrator.hasSpoken(knotAnnouncementPaths(item).model)).toBe(false)
  expect(narrator.hasSpoken(knotAnnouncementPaths(item).item)).toBe(false)
  announcements.enqueue(item, {id: item.id})
  await drain()
  expect(players.map(p => p.name)).toEqual([knotAnnouncementPaths(item).model, knotAnnouncementPaths(item).model, knotAnnouncementPaths(item).item])
})
test('a failed model introduction remains retryable without repeating a completed title', async () => {
  const {narrator, announcements, players, drain} = setup()
  announcements.enqueue(item, {id: item.id})
  await flush()
  players[0].completion.reject(new Error('Missing model recording'))
  await flush()
  await drain()
  expect(narrator.hasSpoken(knotAnnouncementPaths(item).model)).toBe(false)
  expect(narrator.hasSpoken(knotAnnouncementPaths(item).item)).toBe(true)
  announcements.enqueue(item, {id: item.id})
  await drain()
  expect(players.map(p => p.name)).toEqual([knotAnnouncementPaths(item).model, knotAnnouncementPaths(item).item, knotAnnouncementPaths(item).model])
})
test('model interaction queues just the model; candidate surfaces replay independently', async () => {
  const {narrator, announcements, players, drain} = setup()
  announcements.enqueueModel(item, {id: item.id})
  announcements.enqueueModel(item, {id: item.id})
  announcements.enqueueCandidate(glm.data, {id: 'candidate-sign-glm'})
  announcements.enqueueCandidate(glmFlash.data, {id: 'candidate-sign-glm-flash'})
  await drain()
  expect(players.map(p => p.name)).toEqual([knotAnnouncementPaths(item).model, 'candidates/glm/candidate', 'candidates/glm_flash/candidate'])
  expect(narrator.hasSpoken(knotAnnouncementPaths(item).item)).toBe(false)
  expect(narrator.hasSpoken(knotAnnouncementPaths(flash).model)).toBe(false)
  announcements.enqueueCandidate(glm.data, {id: 'candidate-sign-glm'})
  await drain()
  expect(players.at(-1)!.name).toBe('candidates/glm/candidate')
})
test('missing recordings stay silent and never request generated narration', async () => {
  const {narrator, announcements, players} = setup(() => {})
  expect(announcements.enqueue(item, {id: item.id})).toEqual([])
  expect(announcements.enqueueCandidate(glm.data, {id: 'glm'})).toBeUndefined()
  await flush()
  expect(players).toHaveLength(0)
  expect(narrator.hasSpoken(knotAnnouncementPaths(item).model)).toBe(false)
})
