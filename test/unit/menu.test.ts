import type {AiSettings} from '../../src/lib/ai/settings.ts'
import type {MenuStage} from '../../src/lib/gallery/MenuSession.ts'

import {afterEach, beforeEach, describe, expect, spyOn, test} from 'bun:test'

import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {GraphicsQualityProvider} from 'use-graphics-quality'

import Menu from '#component/Menu'

import {parameterParsers} from '../../src/lib/ai/settings.ts'
import {SoundEngine} from '../../src/lib/audio/SoundEngine.ts'
import {galleryEvents, resetGallery, startNewGame} from '../../src/lib/gallery/actions.ts'
import {playerSession, playerSpawn} from '../../src/lib/gallery/PlayerSession.ts'
import {createDocument, markControlled, readControlled, undo, useGallery} from '../../src/lib/gallery/store.ts'

const state = useGallery.getState()
const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
let values: Map<string, string>
let writes: number
beforeEach(() => {
  values = new Map
  writes = 0
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        writes++
        values.set(key, value)
      },
    },
  })
  useGallery.setState({
    ...useGallery.getInitialState(),
    hasControlled: false,
  }, true)
})
afterEach(() => {
  useGallery.setState(state, true)
  if (storageDescriptor) {
    Object.defineProperty(globalThis, 'localStorage', storageDescriptor)
  } else {
    Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
describe('minimal menu', () => {
  test('starts unlocked, with no reset and an expanded OpenRouter section', () => {
    expect(useGallery.getState().locked).toBe(false)
    expect(useGallery.getState().hasControlled).toBe(false)
    const params = Object.fromEntries(Object.entries(parameterParsers).map(([key, parser]) => [key, parser.defaultValue])) as AiSettings
    const html = renderToStaticMarkup(createElement(GraphicsQualityProvider, {
      isQuality: true,
      onChange: () => {},
      children: createElement(Menu, {
        params,
        setParams: async () => new URLSearchParams,
      }),
    }))
    expect(html).toContain('aria-labelledby="menu-title"')
    expect(html).toContain('Mute audio')
    expect(html).toContain('Performance graphics')
    expect(html).toContain('<small>Quality</small>')
    expect(html).toContain('OpenRouter')
    expect(html).toContain('aria-labelledby="openrouter-title"')
    expect(html).not.toContain('<summary>OpenRouter')
    expect(html).not.toContain('Model preferences')
    expect(html).not.toContain('Prepare custom narration')
    expect(html).not.toContain('Open collection')
    expect(html).not.toContain('Preferences &amp; backups')
    expect(html).not.toContain('Controls')
    expect(html).not.toContain('WASD to move')
    expect(html).not.toContain('Reset gallery')
    expect(html).not.toContain('<header')
    expect(html).not.toContain('<footer')
  })
  test('menu actions and acquiring pointer lock alone do not enable reset', () => {
    markControlled()
    expect(useGallery.getState().hasControlled).toBe(false)
    useGallery.setState({locked: true})
    expect(useGallery.getState().hasControlled).toBe(false)
    useGallery.setState({panel: 'map'})
    markControlled()
    expect(useGallery.getState().hasControlled).toBe(false)
    expect(writes).toBe(0)
  })
  test('the first in-game control enables reset and persists the flag exactly once', () => {
    useGallery.setState({locked: true})
    markControlled()
    expect(useGallery.getState().hasControlled).toBe(true)
    expect(readControlled()).toBe(true)
    markControlled()
    expect(writes).toBe(1)
    expect(createDocument()).not.toHaveProperty('hasControlled')
  })
  test('blocked storage does not prevent reset becoming available', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('Storage blocked')
      },
    })
    expect(readControlled()).toBe(false)
    useGallery.setState({locked: true})
    expect(() => markControlled()).not.toThrow()
    expect(useGallery.getState().hasControlled).toBe(true)
  })
  test('reset restores the collection, restarts props and returns home without forgetting prior control', () => {
    useGallery.setState({hasControlled: true})
    useGallery.getState().remove('goose')
    const before = useGallery.getState()
    let homes = 0
    let stops = 0
    const home = () => {
      homes++
    }
    const stop = () => {
      stops++
    }
    galleryEvents.addEventListener('home', home)
    galleryEvents.addEventListener('stop-narration', stop)
    try {
      resetGallery()
      const after = useGallery.getState()
      expect(after.portraits.some(p => p.id === 'goose')).toBe(true)
      expect(after.resetEpoch).toBe(before.resetEpoch + 1)
      expect(after.importEpoch).toBe(before.importEpoch + 1)
      expect(after.hasControlled).toBe(true)
      expect(homes).toBe(1)
      expect(stops).toBe(1)
      expect(undo()).toBe(true)
      expect(useGallery.getState().portraits.some(p => p.id === 'goose')).toBe(false)
    } finally {
      galleryEvents.removeEventListener('home', home)
      galleryEvents.removeEventListener('stop-narration', stop)
    }
  })
})
test.each(['first', 'return', 'pause', 'unfocus'] as const)('renders the %s menu stage', (stage: MenuStage) => {
  const initial = {...useGallery.getInitialState()}
  Object.assign(useGallery.getInitialState(), {
    ready: true,
    hasControlled: true,
    menuStage: stage,
  })
  try {
    const params = Object.fromEntries(Object.entries(parameterParsers).map(([key, parser]) => [key, parser.defaultValue])) as AiSettings
    const html = renderToStaticMarkup(createElement(GraphicsQualityProvider, {
      isQuality: true,
      onChange: () => {},
      children: createElement(Menu, {
        params,
        setParams: async () => new URLSearchParams,
      }),
    }))
    expect(html).toContain(`data-stage="${stage}"`)
    expect(html).toContain(stage === 'first' ? 'Enter gallery' : stage === 'return' ? 'Continue' : 'Resume')
    expect(html.includes('data-testid="minimap"')).toBe(stage === 'pause')
    expect(html.includes('New game')).toBe(stage === 'return')
    expect(html.includes('Your position')).toBe(stage === 'pause')
    expect(html.includes('OpenRouter')).toBe(stage !== 'unfocus')
    expect(html.includes('Mute audio')).toBe(stage !== 'unfocus')
    expect(html.includes('Good taste.')).toBe(stage !== 'unfocus')
    expect(html).not.toContain('Reset gallery')
    expect(html).not.toContain('Confirm reset')
    if (stage === 'unfocus') {
      expect(html.match(/<button\b/gu)).toHaveLength(1)
      expect(html).not.toContain('<input')
      expect(html).not.toContain('Reset gallery')
    }
  } finally {
    Object.assign(useGallery.getInitialState(), initial)
  }
})
test('New game resets and enters directly; it does nothing before the scene is ready', () => {
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const engine: SoundEngine = Object.create(SoundEngine.prototype)
  const getSound = spyOn(SoundEngine, 'get').mockReturnValue(engine)
  const resume = spyOn(engine, 'resume').mockResolvedValue()
  let entered = 0
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      querySelector: () => ({
        requestPointerLock: () => {
          entered++
          expect(useGallery.getState().portraits.some(p => p.id === 'goose')).toBe(true)
          expect(playerSession.snapshot().position).toEqual(playerSpawn.position)
        },
      }),
    },
  })
  try {
    useGallery.getState().remove('goose')
    startNewGame()
    expect(entered).toBe(0)
    expect(useGallery.getState().portraits.some(p => p.id === 'goose')).toBe(false)
    useGallery.setState({
      ready: true,
      menuStage: 'return',
    })
    startNewGame()
    expect(entered).toBe(1)
    expect(useGallery.getState().panel).toBeNull()
    expect(resume).toHaveBeenCalledTimes(1)
  } finally {
    resume.mockRestore()
    getSound.mockRestore()
    if (documentDescriptor) {
      Object.defineProperty(globalThis, 'document', documentDescriptor)
    } else {
      Reflect.deleteProperty(globalThis, 'document')
    }
  }
})
