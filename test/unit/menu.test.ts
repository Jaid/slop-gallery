import {afterEach, beforeEach, describe, expect, test} from 'bun:test'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'

import type {AiSettings} from '../../src/lib/ai/settings.ts'

import Menu from '../../src/components/App/Menu.tsx'
import ResetGallery from '../../src/components/App/ResetGallery.tsx'
import {parameterParsers} from '../../src/lib/ai/settings.ts'
import {galleryEvents, resetGallery} from '../../src/lib/gallery/actions.ts'
import {createDocument, markControlled, readControlled, undo, useGallery} from '../../src/lib/gallery/store.ts'

const state = useGallery.getState()
const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
let values: Map<string, string>
let writes: number
beforeEach(() => {
  values = new Map
  writes = 0
  Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      writes++
      values.set(key, value)
    },
  }})
  useGallery.setState({...useGallery.getInitialState(), hasControlled: false}, true)
})
afterEach(() => {
  useGallery.setState(state, true)
  if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor)
  else Reflect.deleteProperty(globalThis, 'localStorage')
})

describe('minimal menu', () => {
  test('starts unlocked, with no reset or automatic OpenRouter prompt', () => {
    expect(useGallery.getState().locked).toBe(false)
    expect(useGallery.getState().hasControlled).toBe(false)
    expect(renderToStaticMarkup(createElement(ResetGallery))).toBe('')
    const params = Object.fromEntries(Object.entries(parameterParsers).map(([key, parser]) => [key, parser.defaultValue])) as AiSettings
    const html = renderToStaticMarkup(createElement(Menu, {params, setParams: async () => new URLSearchParams}))
    expect(html).toContain('aria-labelledby="menu-title"')
    expect(html).toContain('Mute audio')
    expect(html).toContain('Lightweight graphics')
    expect(html).toContain('OpenRouter')
    expect(html).not.toContain('<details open')
    expect(html).not.toContain('Reset gallery')
    expect(html).not.toContain('<header')
    expect(html).not.toContain('<footer')
  })
  test('menu actions and acquiring pointer lock alone do not enable reset', () => {
    markControlled()
    expect(useGallery.getState().hasControlled).toBe(false)
    useGallery.setState({locked: true})
    expect(useGallery.getState().hasControlled).toBe(false)
    useGallery.setState({panel: 'settings'})
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
    Object.defineProperty(globalThis, 'localStorage', {configurable: true, get() {throw new Error('Storage blocked')}})
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
    const home = () => {homes++}
    const stop = () => {stops++}
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
