import type {Portrait} from '#src/lib/gallery.ts'
import type {HintContent, HintKey} from '#src/lib/interactionHint.ts'

import {interactiveObjects} from '#src/lib/gallery/interactiveObjects.ts'
import {orbitables} from '#src/lib/gallery/orbitables.ts'
import portraitObjects from '#src/lib/gallery/portraitObjects.ts'

import {propObjects} from '../GrabbableProp.tsx'

const inspect: HintKey = {
  controls: ['KeyV'],
  action: 'Inspect',
}
const grab: HintKey = {
  controls: ['MouseLeft'],
  action: 'Grab',
}
const blockedGrab: HintKey = {
  ...grab,
  blocked: true,
}
const throwKey: HintKey = {
  controls: ['MouseRight', 'KeyQ'],
  action: 'Throw',
}
/** The aimed object’s name and the controls that act on it, mirroring the input handlers. */
export function describeTarget(id: string | null, portraits: ReadonlyArray<Portrait>): HintContent | null {
  if (!id) {
    return null
  }
  const portrait = findPortrait(id, portraits)
  const interactive = interactiveObjects.get(id)
  const prop = propObjects.get(id)
  const title = titleOf(id, portrait)
  if (!title) {
    return null
  }
  const keys: Array<HintKey> = []
  // E activates registered objects first and narrates portraits otherwise.
  if (interactive) {
    keys.push({
      controls: ['KeyE'],
      action: interactive.action ?? 'Use',
    })
  } else if (portrait) {
    keys.push({
      controls: ['KeyE'],
      action: 'Listen',
    })
  }
  // Holding V inspects hung portraits and orbits around exhibits.
  if (portrait?.hung || interactive?.inspectable || orbitables.has(id)) {
    keys.push(inspect)
  }
  if (prop) {
    keys.push(prop.canGrab() ? grab : blockedGrab)
  } else if (portrait) {
    keys.push(portrait.merging ? blockedGrab : grab)
  }
  if (!keys.length) {
    return null
  }
  return {
    id,
    title,
    keys,
  }
}
/** While carrying something, throwing it is the only remaining control besides letting go of the left button. */
export function describeHeld(id: string, portraits: ReadonlyArray<Portrait>): HintContent | null {
  const title = titleOf(id, findPortrait(id, portraits))
  if (!title) {
    return null
  }
  return {
    id,
    title,
    keys: [throwKey],
  }
}

function findPortrait(id: string, portraits: ReadonlyArray<Portrait>) {
  return portraitObjects.has(id) ? portraits.find(candidate => candidate.id === id) : undefined
}
function titleOf(id: string, portrait: Portrait | undefined) {
  return interactiveObjects.get(id)?.title ?? portrait?.title ?? propObjects.get(id)?.title ?? orbitables.get(id)?.title
}
