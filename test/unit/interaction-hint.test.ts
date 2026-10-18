import type {PropHandle} from '../../src/components/Scene/GrabbableProp.tsx'
import type {Portrait} from '../../src/lib/gallery/types.ts'
import type {HintContent} from '../../src/lib/interactionHint.ts'

import {afterEach, describe, expect, test} from 'bun:test'

import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {Group} from 'three/webgpu'

import {InteractionHintView} from '#component/InteractionHint'

import {propObjects} from '../../src/components/Scene/GrabbableProp.tsx'
import {describeHeld, describeTarget} from '../../src/components/Scene/interaction/describeTarget.ts'
import {readCrosshair} from '../../src/lib/crosshair.ts'
import initialPortraits from '../../src/lib/gallery/collection.ts'
import {interactiveObjects, registerInteractiveObject} from '../../src/lib/gallery/interactiveObjects.ts'
import portraitObjects from '../../src/lib/gallery/portraitObjects.ts'
import {InteractionHint} from '../../src/lib/interactionHint.ts'

const sign: HintContent = {
  id: 'sign',
  title: 'Sign',
  keys: [
    {
      controls: ['KeyE'],
      action: 'Use',
    },
    {
      controls: ['MouseLeft'],
      action: 'Grab',
    },
  ],
}
const knot: HintContent = {
  id: 'knot',
  title: 'Knot',
  keys: [
    {
      controls: ['KeyV'],
      action: 'Inspect',
    },
  ],
}
describe('?crosshair', () => {
  test('is off by default', () => {
    expect(readCrosshair('https://slop.gallery/')).toBe(false)
    expect(readCrosshair('https://slop.gallery/?crosshair=false')).toBe(false)
    expect(readCrosshair('https://slop.gallery/?crosshair=0')).toBe(false)
  })
  test('a bare flag or true enables it', () => {
    expect(readCrosshair('https://slop.gallery/?crosshair')).toBe(true)
    expect(readCrosshair('https://slop.gallery/?crosshair=true')).toBe(true)
    expect(readCrosshair('https://slop.gallery/?graphics=heavy&crosshair')).toBe(true)
    expect(readCrosshair('https://slop.gallery/?crosshair=always')).toBe('always')
  })
})
describe('hint debouncing', () => {
  test('a target has to stay aimed for the dwell time before its hint appears', () => {
    const hint = new InteractionHint({
      dwell: 0.3,
      grace: 0.15,
    })
    hint.update(sign, 0)
    expect(hint.getSnapshot().visible).toBe(false)
    hint.update(sign, 0.29)
    expect(hint.getSnapshot().visible).toBe(false)
    hint.update(sign, 0.3)
    expect(hint.getSnapshot()).toEqual({
      content: sign,
      visible: true,
    })
  })
  test('sweeping across several objects never shows a hint', () => {
    const hint = new InteractionHint({dwell: 0.3})
    let updates = 0
    const unsubscribe = hint.subscribe(() => updates++)
    for (let frame = 0; frame < 60; frame++) {
      const time = frame / 60
      hint.update([sign, null, knot][Math.floor(time / 0.2) % 3], time)
    }
    unsubscribe()
    expect(updates).toBe(0)
    expect(hint.getSnapshot().visible).toBe(false)
  })
  test('looking away for a moment restarts the dwell', () => {
    const hint = new InteractionHint({dwell: 0.3})
    hint.update(sign, 0)
    hint.update(null, 0.2)
    hint.update(sign, 0.25)
    hint.update(sign, 0.5)
    expect(hint.getSnapshot().visible).toBe(false)
    hint.update(sign, 0.55)
    expect(hint.getSnapshot().visible).toBe(true)
  })
  test('a shown hint survives brief aim jitter and hides after the grace period, keeping its text for the exit animation', () => {
    const hint = new InteractionHint({
      dwell: 0.3,
      grace: 0.15,
    })
    hint.update(sign, 0)
    hint.update(sign, 0.3)
    hint.update(null, 0.35)
    hint.update(sign, 0.45)
    expect(hint.getSnapshot().visible).toBe(true)
    hint.update(null, 0.5)
    hint.update(null, 0.64)
    expect(hint.getSnapshot().visible).toBe(true)
    hint.update(null, 0.65)
    expect(hint.getSnapshot()).toEqual({
      content: sign,
      visible: false,
    })
  })
  test('switching from a shown target to another one waits for the new dwell', () => {
    const hint = new InteractionHint({
      dwell: 0.3,
      grace: 0.15,
    })
    hint.update(sign, 0)
    hint.update(sign, 0.3)
    hint.update(knot, 0.4)
    expect(hint.getSnapshot().content).toBe(sign)
    hint.update(knot, 0.6)
    expect(hint.getSnapshot().visible).toBe(false)
    hint.update(knot, 0.75)
    expect(hint.getSnapshot()).toEqual({
      content: knot,
      visible: true,
    })
  })
  test('changed controls on the shown target update in place', () => {
    const hint = new InteractionHint({dwell: 0.3})
    hint.update(sign, 0)
    hint.update(sign, 0.3)
    const blocked = {
      ...sign,
      keys: [
        sign.keys[0],
        {
          ...sign.keys[1],
          blocked: true,
        },
      ],
    }
    hint.update(blocked, 0.31)
    expect(hint.getSnapshot()).toEqual({
      content: blocked,
      visible: true,
    })
    let updates = 0
    const unsubscribe = hint.subscribe(() => updates++)
    hint.update({
      ...blocked,
      keys: blocked.keys.map(key => ({...key})),
    }, 0.32)
    unsubscribe()
    expect(updates).toBe(0)
  })
  test('suppression hides a shown hint without forgetting its target and restores it without a new dwell', () => {
    const hint = new InteractionHint({
      dwell: 0.3,
      grace: 0.15,
    })
    hint.update(sign, 0)
    hint.update(sign, 0.3)
    hint.setSuppressed(true)
    expect(hint.getSnapshot()).toEqual({
      content: sign,
      visible: false,
    })
    hint.update(sign, 1)
    expect(hint.getSnapshot().visible).toBe(false)
    hint.setSuppressed(false)
    expect(hint.getSnapshot()).toEqual({
      content: sign,
      visible: true,
    })
  })
  test('targets keep being tracked while suppressed', () => {
    const hint = new InteractionHint({
      dwell: 0.3,
      grace: 0.15,
    })
    hint.setSuppressed(true)
    hint.update(knot, 0)
    hint.update(knot, 0.3)
    expect(hint.getSnapshot()).toEqual({
      content: knot,
      visible: false,
    })
    hint.update(null, 0.4)
    hint.update(null, 0.6)
    hint.setSuppressed(false)
    expect(hint.getSnapshot().visible).toBe(false)
    hint.setSuppressed(true)
    hint.update(sign, 0.7)
    hint.setSuppressed(false)
    expect(hint.getSnapshot().visible).toBe(false)
    hint.update(sign, 1)
    expect(hint.getSnapshot()).toEqual({
      content: sign,
      visible: true,
    })
  })
  test('repeated suppression changes do not notify', () => {
    const hint = new InteractionHint
    hint.update(sign, 0, true)
    let updates = 0
    const unsubscribe = hint.subscribe(() => updates++)
    hint.setSuppressed(true)
    hint.setSuppressed(true)
    hint.setSuppressed(false)
    hint.setSuppressed(false)
    unsubscribe()
    expect(updates).toBe(2)
  })
  test('immediate updates skip both delays', () => {
    const hint = new InteractionHint({
      dwell: 0.3,
      grace: 0.15,
    })
    hint.update(sign, 0, true)
    expect(hint.getSnapshot().visible).toBe(true)
    hint.update(null, 0.01, true)
    expect(hint.getSnapshot().visible).toBe(false)
  })
})
const prop = (canGrab: boolean, title = 'A very serious knot') => ({
  title,
  canGrab: () => canGrab,
}) as unknown as PropHandle
describe('target descriptions', () => {
  afterEach(() => {
    interactiveObjects.clear()
    propObjects.clear()
    portraitObjects.clear()
  })
  test('nothing aimed means no hint', () => {
    expect(describeTarget(null, [])).toBeNull()
    expect(describeTarget('unregistered', [])).toBeNull()
  })
  test('a hung portrait can be narrated, inspected and grabbed', () => {
    const portrait: Portrait = {
      ...initialPortraits[0],
      hung: true,
    }
    portraitObjects.set(portrait.id, {} as never)
    expect(describeTarget(portrait.id, [portrait])).toEqual({
      id: portrait.id,
      title: portrait.title,
      keys: [
        {
          controls: ['KeyE'],
          action: 'Listen',
        },
        {
          controls: ['KeyV'],
          action: 'Inspect',
        },
        {
          controls: ['MouseLeft'],
          action: 'Grab',
        },
      ],
    })
    expect(describeTarget(portrait.id, [{
      ...portrait,
      hung: false,
      merging: true,
    }])?.keys).toEqual([
      {
        controls: ['KeyE'],
        action: 'Listen',
      },
      {
        controls: ['MouseLeft'],
        action: 'Grab',
        blocked: true,
      },
    ])
  })
  test('a plain prop can only be grabbed', () => {
    propObjects.set('prop-apple', prop(true, 'The original forbidden download'))
    expect(describeTarget('prop-apple', [])).toEqual({
      id: 'prop-apple',
      title: 'The original forbidden download',
      keys: [
        {
          controls: ['MouseLeft'],
          action: 'Grab',
        },
      ],
    })
  })
  test('registered objects use their own name and verb, and grabbing reflects the prop’s current state', () => {
    propObjects.set('prop-knot-a', prop(false, 'K-1 · Knot · Model'))
    registerInteractiveObject('prop-knot-a', {
      group: new Group,
      activate: () => {},
      action: 'Listen',
      inspectable: true,
      title: 'Knot',
    })
    expect(describeTarget('prop-knot-a', [])).toEqual({
      id: 'prop-knot-a',
      title: 'Knot',
      keys: [
        {
          controls: ['KeyE'],
          action: 'Listen',
        },
        {
          controls: ['KeyV'],
          action: 'Inspect',
        },
        {
          controls: ['MouseLeft'],
          action: 'Grab',
          blocked: true,
        },
      ],
    })
  })
  test('soundboard buttons default to “Use” without grab or inspect', () => {
    registerInteractiveObject('SFX-01', {
      group: new Group,
      activate: () => {},
      title: 'Chime',
    })
    expect(describeTarget('SFX-01', [])?.keys).toEqual([
      {
        controls: ['KeyE'],
        action: 'Use',
      },
    ])
  })
  test('a held object offers throwing with either control', () => {
    propObjects.set('prop-apple', prop(false, 'The original forbidden download'))
    expect(describeHeld('prop-apple', [])).toEqual({
      id: 'prop-apple',
      title: 'The original forbidden download',
      keys: [
        {
          controls: ['MouseRight', 'KeyQ'],
          action: 'Throw',
        },
      ],
    })
  })
})
describe('hint view', () => {
  test('renders the name, styled keys and mouse icons', () => {
    const html = renderToStaticMarkup(createElement(InteractionHintView, {
      content: {
        id: 'sign',
        title: 'Sign',
        keys: [
          {
            controls: ['KeyE'],
            action: 'Use',
          },
          {
            controls: ['MouseRight', 'KeyQ'],
            action: 'Throw',
          },
          {
            controls: ['MouseLeft'],
            action: 'Grab',
            blocked: true,
          },
        ],
      },
      visible: true,
    }))
    expect(html).toContain('data-testid="interaction-hint"')
    expect(html).toContain('data-visible="true"')
    expect(html).toContain('Sign')
    expect(html.match(/<kbd/g)).toHaveLength(4)
    expect(html).toMatch(/<kbd[^>]*>E<\/kbd>/)
    expect(html).toContain('aria-label="Left mouse button"')
    expect(html).toContain('aria-label="Right mouse button"')
    expect(html.match(/<svg/g)).toHaveLength(2)
    expect(html).toContain('Grab is not possible right now')
  })
  test('hidden hints stay in the DOM for the exit animation but are hidden from assistive tech', () => {
    const html = renderToStaticMarkup(createElement(InteractionHintView, {
      content: sign,
      visible: false,
    }))
    expect(html).toContain('data-visible="false"')
    expect(html).toContain('aria-hidden="true"')
  })
})
