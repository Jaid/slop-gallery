import {afterEach, beforeEach, describe, expect, test} from 'bun:test'

import {createAimDot} from '../../src/lib/aimDot.ts'
import crosshair, {CrosshairPreference, crosshairToggleKey} from '../../src/lib/crosshair.ts'
import {handleGalleryKey} from '../../src/lib/gallery/actions.ts'
import {useGallery} from '../../src/lib/gallery/store.ts'

const previousHTMLElement = globalThis.HTMLElement
class ElementDouble extends EventTarget {
  isContentEditable = false
  closest(selector: string) {
    return selector === 'input, textarea, select' ? this : null
  }
}
const press = (patch: Partial<KeyboardEvent> = {}) => handleGalleryKey({
  code: crosshairToggleKey,
  target: null,
  defaultPrevented: false,
  repeat: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  preventDefault() {},
  ...patch,
} as unknown as KeyboardEvent)
describe('crosshair preference', () => {
  test('starts from the given value and only notifies on real changes', () => {
    const preference = new CrosshairPreference(false)
    let updates = 0
    const unsubscribe = preference.subscribe(() => updates++)
    expect(preference.getSnapshot()).toBe(false)
    expect(preference.toggle()).toBe(true)
    preference.set(true)
    expect(preference.getSnapshot()).toBe(true)
    expect(preference.toggle()).toBe(false)
    unsubscribe()
    preference.toggle()
    expect(updates).toBe(2)
  })
  test('without an explicit value it follows ?crosshair, which is absent in tests', () => {
    const preference = new CrosshairPreference
    expect(preference.getSnapshot()).toBe(false)
  })
})
describe('aim dot', () => {
  test('hides while V viewing or zoom blocks it', () => {
    const aimDot = createAimDot(false)
    let updates = 0
    aimDot.subscribe(() => updates++)
    aimDot.setBlocked('viewing', true)
    expect(aimDot.getSnapshot()).toBe(false)
    aimDot.setBlocked('zoom', true)
    aimDot.setBlocked('viewing', false)
    expect(aimDot.getSnapshot()).toBe(false)
    aimDot.setBlocked('zoom', false)
    expect(aimDot.getSnapshot()).toBe(true)
    expect(updates).toBe(2)
  })
  test('stays visible through blockers with ?crosshair=always', () => {
    const aimDot = createAimDot(true)
    aimDot.setBlocked('viewing', true)
    aimDot.setBlocked('zoom', true)
    expect(aimDot.getSnapshot()).toBe(true)
  })
})
describe('H key', () => {
  beforeEach(() => {
    Object.assign(globalThis, {HTMLElement: ElementDouble})
    crosshair.set(false)
    useGallery.setState({
      locked: true,
      panel: null,
      dragging: false,
    })
  })
  afterEach(() => {
    Object.assign(globalThis, {HTMLElement: previousHTMLElement})
    crosshair.set(false)
    useGallery.setState({
      locked: false,
      sound: false,
    })
  })
  test('shows and hides the aim dot while playing', () => {
    press()
    expect(crosshair.getSnapshot()).toBe(true)
    press()
    expect(crosshair.getSnapshot()).toBe(false)
  })
  test('is ignored outside of play, with modifiers, on key repeat and in text fields', () => {
    useGallery.setState({locked: false})
    press()
    useGallery.setState({
      locked: true,
      panel: 'map',
    })
    press()
    useGallery.setState({
      panel: null,
      dragging: true,
    })
    press()
    useGallery.setState({dragging: false})
    press({repeat: true})
    press({ctrlKey: true})
    press({altKey: true})
    press({metaKey: true})
    press({defaultPrevented: true})
    press({target: new ElementDouble})
    expect(crosshair.getSnapshot()).toBe(false)
  })
  test('does not touch the sound setting', () => {
    useGallery.setState({sound: true})
    press()
    expect(useGallery.getState().sound).toBe(true)
  })
})
