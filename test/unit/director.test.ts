import type {AiSettings} from '../../src/lib/ai/settings.ts'
import type {FusionSpec} from '../../src/lib/gallery/fusion/Fusion.ts'
import type {FusionTiming} from '../../src/lib/gallery/fusion/timing.ts'
import type {Portrait, ThrownOrb} from '../../src/lib/gallery/types.ts'

import {beforeEach, expect, test} from 'bun:test'

import GalleryDirector from '../../src/lib/ai/GalleryDirector.ts'
import {readAiSettings} from '../../src/lib/ai/settings.ts'
import Fusion from '../../src/lib/gallery/fusion/Fusion.ts'
import {portalFrame} from '../../src/lib/gallery/fusion/portalFrame.ts'
import {useGallery} from '../../src/lib/gallery/store.ts'
import samplePortraits from './fixtures/portraits.ts'

const defaults: AiSettings = readAiSettings()
const original = {
  ...useGallery.getState(),
  portraits: samplePortraits.map(p => ({...p})),
}
const a = new Blob(['hanging'], {type: 'image/webp'})
const b = new Blob(['thrown'], {type: 'image/webp'})
beforeEach(() => {
  useGallery.setState(original, true)
  useGallery.setState({
    sound: false,
    portraits: original.portraits.slice(0, 2).map((p, i) => ({
      ...p,
      id: i ? 'b' : 'a',
      source: i ? b : a,
      hung: !i,
      wallId: i ? undefined : p.wallId,
    })),
  })
})
const instant: FusionTiming = {
  intro: 0,
  ingredient: 1,
  minimum: 0,
  climax: 0,
  afterglow: 0,
  fizzle: 0,
}
class TestDirector extends GalleryDirector {
  /** the shape the image model was asked for */
  aspect: number | undefined
  flavorResult = Promise.withResolvers<Partial<Portrait>>()
  opened: Array<Fusion> = []
  partial: ((partial: Partial<Portrait>) => void) | undefined
  received: Array<Portrait['source']> = []
  result = Promise.withResolvers<Blob>()
  /** the pixel size of the result */
  resultSize = [1024, 1024]
  constructor(settings: AiSettings, key: string, private timing = instant) {
    super(settings, key)
  }
  protected override generateFlavor(_image: Blob, partial: (partial: Partial<Portrait>) => void) {
    this.partial = partial
    return this.flavorResult.promise
  }
  protected override generateMerge(first: Portrait['source'], second: Portrait['source'], _signal: AbortSignal, aspect: number) {
    this.received = [first, second]
    this.aspect = aspect
    return this.sized()
  }
  protected override generateOrbMerge(work: Portrait['source'], orb: ThrownOrb, _signal: AbortSignal, aspect: number) {
    this.received = [work, orb.prompt]
    this.aspect = aspect
    return this.sized()
  }
  protected override openFusion(spec: FusionSpec) {
    const fusion = new Fusion(spec, {
      frame: portalFrame(spec.work, {
        floor: 0,
        room: 5,
        sides: [3, 3],
      }),
      timing: this.timing,
    })
    this.opened.push(fusion)
    return fusion
  }
  private async sized() {
    const image = await this.result.promise
    const [width, height] = this.resultSize
    return {
      image,
      width,
      height,
    }
  }
}
test('fusion keeps both originals until success and commits one change', async () => {
  const director = new TestDirector({
    ...defaults,
    ai: false,
  }, '')
  const job = director.merge('a', 'b')
  expect(director.received).toEqual([a, b])
  expect(useGallery.getState().portraits).toHaveLength(2)
  const merged = new Blob(['result'], {type: 'image/webp'})
  director.result.resolve(merged)
  await job
  expect(useGallery.getState().portraits).toHaveLength(1)
  expect(useGallery.getState().portraits[0].source).toBe(merged)
  director.dispose()
})
for (const partner of ['work', 'orb']) {
  test(`a merge with a thrown ${partner} frames the result in its own shape at the area of the hung work’s frame`, async () => {
    useGallery.getState().update('a', {
      width: 3,
      height: 2,
    })
    const director = new TestDirector({
      ...defaults,
      ai: false,
    }, '')
    try {
      // Asked for 3:2, the model still made something squarer.
      director.resultSize = [1200, 1000]
      const job = partner === 'orb' ? director.mergeItem('a', {
        id: 'prop-orb-test',
        title: 'Test Orb',
        color: '#8a3cff',
        prompt: 'Make it spooky.',
        snapshot: () => Promise.resolve(new Blob(['orb'], {type: 'image/webp'})),
      }) : director.merge('a', 'b')
      director.result.resolve(new Blob(['result'], {type: 'image/webp'}))
      await job
      expect(director.aspect).toBe(1.5)
      const portrait = useGallery.getState().portraits.find(p => p.id === 'a')!
      expect(portrait.width / portrait.height).toBeCloseTo(1.2, 9)
      expect(portrait.width * portrait.height).toBeCloseTo(6, 9)
    } finally {
      director.dispose()
    }
  })
}
test('failed fusion releases both originals', async () => {
  const director = new TestDirector(defaults, 'test')
  const job = director.merge('a', 'b')
  director.result.reject(new Error('Provider unavailable'))
  await job
  expect(useGallery.getState().portraits.map(p => p.source)).toEqual([a, b])
  expect(useGallery.getState().portraits.some(p => p.merging || p.reserved)).toBe(false)
  director.dispose()
})
test('removing one original releases the survivor and ignores late success', async () => {
  const director = new TestDirector(defaults, 'test')
  const job = director.merge('a', 'b')
  useGallery.getState().remove('a')
  director.result.resolve(new Blob(['late']))
  await job
  expect(useGallery.getState().portraits).toHaveLength(1)
  expect(useGallery.getState().portraits[0]).toMatchObject({
    id: 'b',
    reserved: false,
  })
  director.dispose()
})
test('canceling a director prevents late changes', async () => {
  const director = new TestDirector(defaults, 'test')
  const job = director.merge('a', 'b')
  director.dispose()
  director.result.resolve(new Blob(['late']))
  await job
  expect(useGallery.getState().portraits.map(p => p.source)).toEqual([a, b])
})
test('streamed labels never overwrite a subsequent manual edit', async () => {
  const director = new TestDirector(defaults, 'test')
  const job = director.flavor(useGallery.getState().portraits[0])
  await Promise.resolve()
  director.partial?.({title: 'Streaming title'})
  expect(useGallery.getState().portraits[0].title).toBe('Streaming title')
  useGallery.getState().update('a', {
    title: 'My label',
    pending: false,
  })
  director.partial?.({title: 'Late stream'})
  director.flavorResult.resolve({title: 'Late final'})
  await job
  expect(useGallery.getState().portraits[0].title).toBe('My label')
  director.dispose()
})
test('streamed artwork years are retained and invalid provider years are ignored', async () => {
  const director = new TestDirector(defaults, 'test')
  try {
    const job = director.flavor(useGallery.getState().portraits[0])
    await Promise.resolve()
    director.partial?.({year: 1924})
    expect(useGallery.getState().portraits[0].year).toBe(1924)
    director.partial?.({year: 1924.5})
    expect(useGallery.getState().portraits[0].year).toBe(1924)
    director.partial?.({year: Infinity})
    expect(useGallery.getState().portraits[0].year).toBe(1924)
    director.flavorResult.resolve({year: 1925})
    await job
    expect(useGallery.getState().portraits[0].year).toBe(1925)
  } finally {
    director.dispose()
  }
})
test('obsolete merge cleanup cannot cancel its replacement', async () => {
  const old = new TestDirector({
    ...defaults,
    ai: false,
  }, '')
  const obsolete = old.merge('a', 'b')
  old.dispose()
  const replacement = new TestDirector({
    ...defaults,
    ai: false,
  }, '')
  try {
    const job = replacement.merge('a', 'b')
    old.result.resolve(new Blob(['obsolete'], {type: 'image/webp'}))
    await obsolete
    expect(useGallery.getState().portraits[0].merging).toBe(true)
    expect(useGallery.getState().portraits[1].reserved).toBe(true)
    const merged = new Blob(['replacement'], {type: 'image/webp'})
    replacement.result.resolve(merged)
    await job
    expect(useGallery.getState().portraits.map(p => p.source)).toEqual([merged])
  } finally {
    replacement.dispose()
  }
})
test('disposing a different director does not release another director’s label or merge', async () => {
  const owner = new TestDirector(defaults, 'test')
  const unrelated = new TestDirector(defaults, 'test')
  const job = owner.merge('a', 'b')
  unrelated.dispose()
  expect(useGallery.getState().portraits[0].merging).toBe(true)
  owner.result.reject(new Error('test'))
  await job
  owner.dispose()
})
const apple = {
  id: 'prop-apple',
  title: 'the apple',
  snapshot: () => Promise.resolve(new Blob(['apple'], {type: 'image/webp'})),
}
test('a thrown item merges into the hung work and leaves the collection size alone', async () => {
  const director = new TestDirector({
    ...defaults,
    ai: false,
  }, '')
  const job = director.mergeItem('a', apple)
  expect(useGallery.getState().portraits[0].merging).toBe(true)
  await Promise.resolve()
  await Promise.resolve()
  expect(director.received[0]).toBe(a)
  expect(await (director.received[1] as Blob).text()).toBe('apple')
  const merged = new Blob(['result'], {type: 'image/webp'})
  director.result.resolve(merged)
  await job
  const portraits = useGallery.getState().portraits
  expect(portraits).toHaveLength(2)
  expect(portraits[0]).toMatchObject({
    id: 'a',
    source: merged,
    merging: false,
    hung: false,
  })
  expect(portraits[0].description).toContain('struck by the apple')
  expect(portraits[1].source).toBe(b)
  director.dispose()
})
test('a thrown item cannot merge into a loose, merging or reserved work', async () => {
  const director = new TestDirector(defaults, 'test')
  await director.mergeItem('b', apple)
  expect(director.received).toEqual([])
  const job = director.mergeItem('a', apple)
  await director.mergeItem('a', apple)
  expect(useGallery.getState().portraits[0].mergeJob).toBeDefined()
  director.result.reject(new Error('Provider unavailable'))
  await job
  expect(useGallery.getState().portraits[0]).toMatchObject({
    source: a,
    merging: false,
  })
  director.dispose()
})
test('a failing photograph releases the work', async () => {
  const director = new TestDirector(defaults, 'test')
  await director.mergeItem('a', {
    ...apple,
    snapshot: () => Promise.reject(new Error('No GPU')),
  })
  expect(useGallery.getState().portraits[0]).toMatchObject({
    source: a,
    merging: false,
  })
  director.dispose()
})
test('a thrown orb reworks the hung work by its prompt instead of a photograph', async () => {
  const director = new TestDirector({
    ...defaults,
    ai: false,
  }, '')
  try {
    const photograph = new Blob(['orb'], {type: 'image/webp'})
    const job = director.mergeItem('a', {
      id: 'prop-orb-test',
      title: 'Test Orb',
      color: '#8a3cff',
      prompt: 'Make it spooky.',
      snapshot: () => Promise.resolve(photograph),
    })
    expect(useGallery.getState().portraits[0].merging).toBe(true)
    await Promise.resolve()
    expect(director.received).toEqual([a, 'Make it spooky.'])
    // The orb’s photograph only surfaces in the portal, tinted in its glow.
    expect(director.opened[0].spec).toMatchObject({
      color: '#8a3cff',
      ingredients: [a, photograph],
    })
    const merged = new Blob(['spooky'], {type: 'image/webp'})
    director.result.resolve(merged)
    await job
    const [portrait] = useGallery.getState().portraits
    expect(portrait).toMatchObject({
      id: 'a',
      source: merged,
      merging: false,
      hung: false,
    })
    expect(portrait.description).toContain('caught the Test Orb')
    expect(portrait.description).toContain('Tinted by hand in the Test Orb’s glow.')
  } finally {
    director.dispose()
  }
})
test('generated image admission failure preserves both originals', async () => {
  const director = new TestDirector({
    ...defaults,
    ai: false,
  }, '')
  try {
    const job = director.merge('a', 'b')
    director.result.resolve(new Blob([new Uint8Array(25_000_001)], {type: 'image/webp'}))
    await job
    expect(useGallery.getState().portraits.map(p => p.source)).toEqual([a, b])
    expect(useGallery.getState().portraits.some(p => p.merging || p.reserved)).toBe(false)
  } finally {
    director.dispose()
  }
})
const brief: FusionTiming = {
  intro: 0.02,
  ingredient: 0.04,
  minimum: 0.15,
  climax: 0.05,
  afterglow: 0.05,
  fizzle: 0.05,
}
const sleep = (seconds: number) => new Promise(resolve => setTimeout(resolve, seconds * 1000))
test('the result flips out of the portal as a loose work, no sooner than the fusion’s minimum and climax', async () => {
  const director = new TestDirector({
    ...defaults,
    ai: false,
  }, '', brief)
  try {
    const {rotation} = useGallery.getState().portraits[0]
    const job = director.merge('a', 'b')
    const merged = new Blob(['result'], {type: 'image/webp'})
    director.result.resolve(merged)
    await sleep(0.1)
    // The image is in, but the portal brews on until its minimum.
    expect(useGallery.getState().portraits.map(p => p.source)).toEqual([a, b])
    expect(director.opened[0].outcome).toEqual({
      kind: 'success',
      at: brief.minimum,
    })
    await job
    const [fusion] = director.opened
    expect(fusion.elapsed()).toBeGreaterThanOrEqual(brief.minimum + brief.climax)
    expect(fusion.emergedAt).toBeDefined()
    const [portrait] = useGallery.getState().portraits
    expect(portrait).toMatchObject({
      id: 'a',
      source: merged,
      hung: false,
      wallId: undefined,
      position: fusion.frame.center,
      rotation,
    })
    expect(portrait.velocity?.[1]).toBeGreaterThan(3)
    expect(Math.hypot(...portrait.spin!)).toBeGreaterThan(5)
    // The portal glows on after the result is out, then closes.
    expect(fusion.closed).toBe(false)
    await sleep(brief.afterglow + 0.12)
    expect(fusion.closed).toBe(true)
  } finally {
    director.dispose()
  }
})
test('whatever the player carries when the result flips out stays in hand', async () => {
  const director = new TestDirector({
    ...defaults,
    ai: false,
  }, '')
  try {
    const job = director.merge('a', 'b')
    useGallery.setState({held: 'prop-apple'})
    director.result.resolve(new Blob(['result'], {type: 'image/webp'}))
    await job
    expect(useGallery.getState().portraits).toHaveLength(1)
    expect(useGallery.getState().held).toBe('prop-apple')
  } finally {
    director.dispose()
  }
})
test('a failure shows once the fusion fizzled out after its minimum, then releases both originals', async () => {
  const director = new TestDirector(defaults, 'test', brief)
  try {
    const job = director.merge('a', 'b')
    director.result.reject(new Error('Provider unavailable'))
    await sleep(0.08)
    expect(useGallery.getState().portraits.find(p => p.id === 'a')?.merging).toBe(true)
    expect(director.opened[0].outcome?.kind).toBe('failure')
    await job
    expect(director.opened[0].elapsed()).toBeGreaterThanOrEqual(brief.minimum + brief.fizzle)
    expect(director.opened[0].closed).toBe(true)
    expect(useGallery.getState().portraits.some(p => p.merging || p.reserved)).toBe(false)
    expect(useGallery.getState().notice).toContain('did not finish')
  } finally {
    director.dispose()
  }
})
test('disposing the director closes its fusions at once', async () => {
  const director = new TestDirector(defaults, 'test', brief)
  const job = director.merge('a', 'b')
  director.dispose()
  const [fusion] = director.opened
  expect(fusion.closed).toBe(true)
  expect(fusion.outcome?.kind).toBe('abort')
  director.result.resolve(new Blob(['late'], {type: 'image/webp'}))
  await job
  expect(useGallery.getState().portraits.map(p => p.source)).toEqual([a, b])
})
