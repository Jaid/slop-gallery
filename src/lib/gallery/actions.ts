import type {Panel} from './store.ts'
import type {Portrait, Vec3} from './types.ts'

import composeId from 'compose-id'

import placement from '#level/placement.ts'

import aimDot from '../aimDot.ts'
import SoundEngine from '../audio/SoundEngine.ts'
import crosshair, {crosshairToggleKey} from '../crosshair.ts'
import {isDevelopmentMode} from '../developmentMode.ts'
import {rollSeed} from '../environmentSeed.ts'
import {hiddenUiKey, toggleHiddenUi} from '../hiddenUi.ts'
import pauseMenu from '../pauseMenu.ts'
import {graphicsTuningKey, toggleGraphicsTuning} from '../rendering/customGraphics.ts'
import {sessionStore} from '../temporary.ts'
import {bookmarkKey, teleportToNextBookmark} from './bookmarks.ts'
import defaultPortraits from './defaultPortraits.ts'
import {flyModeKey, toggleFlyMode} from './flyMode.ts'
import {playerSession, playerSpawn} from './PlayerSession.ts'
import {redo, undo, useGallery} from './store.ts'

export const cameraPose = {
  focused: false,
  position: [playerSpawn.position[0], playerSpawn.position[1] + 1.6, playerSpawn.position[2]] as Vec3,
  direction: [-Math.sin(playerSpawn.yaw) * Math.cos(playerSpawn.pitch), Math.sin(playerSpawn.pitch), -Math.cos(playerSpawn.yaw) * Math.cos(playerSpawn.pitch)] as Vec3,
}
export function setCameraFocused(focused: boolean) {
  cameraPose.focused = focused
  aimDot.setBlocked('viewing', focused)
}

export const dragPose = {
  active: false,
  x: 0,
  y: 0,
}
export const galleryEvents = new EventTarget
let noticeTimer: ReturnType<typeof setTimeout>

export function notify(notice: string) {
  useGallery.setState({notice})
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => useGallery.setState({notice: ''}), 6500)
}

export function openPanel(panel: Panel) {
  pauseMenu.release()
  useGallery.setState({
    panel,
    activeLabel: null,
    held: null,
    placement: null,
  })
  galleryEvents.dispatchEvent(new Event('cancel-view'))
}

export function enterGallery() {
  if (!useGallery.getState().ready) {
    return
  }
  useGallery.setState({panel: null})
  galleryEvents.dispatchEvent(new Event('cancel-view'))
  void SoundEngine.get().resume().catch(() => notify('Audio could not be enabled.'))
  void pauseMenu.enter().catch(() => notify('Click the gallery to begin exploring.'))
}

export function chime(frequency = 320) {
  if (useGallery.getState().sound) {
    SoundEngine.get().tone(frequency)
  }
}

export function narrate(id: string) {
  void SoundEngine.get().resume().catch(() => notify('Audio could not be enabled.'))
  galleryEvents.dispatchEvent(new CustomEvent('narrate', {detail: id}))
}

export function narrateModel(id: string) {
  void SoundEngine.get().resume().catch(() => notify('Audio could not be enabled.'))
  galleryEvents.dispatchEvent(new CustomEvent('narrate-model', {detail: id}))
}

export function stopNarration() {
  galleryEvents.dispatchEvent(new Event('stop-narration'))
}

export function requestMerge(first: string, second: string) {
  galleryEvents.dispatchEvent(new CustomEvent('merge', {detail: [first, second]}))
}

/** Knocks a hung work off its wall, as one undoable step that keeps whatever the player holds. */
export function dropPortrait(id: string) {
  const state = useGallery.getState()
  const portrait = state.portraits.find(candidate => candidate.id === id)
  if (!portrait?.hung || portrait.reserved || portrait.merging || state.held === id) {
    return false
  }
  const {held, placement: heldPlacement} = state
  // The frame faces +z before its yaw; it tips forward off the wall and falls.
  state.commit(state.portraits.map(candidate => (candidate.id === id ? {
    ...candidate,
    hung: false,
    wallId: undefined,
    orientation: undefined,
    velocity: [Math.sin(portrait.rotation) * 0.8, 0.4, Math.cos(portrait.rotation) * 0.8],
  } : candidate)))
  useGallery.setState({
    held,
    placement: heldPlacement,
  })
  chime(110)
  notify('Down it goes. Undo hangs it back up.')
  return true
}

export function viewPortrait(id: string) {
  if (!useGallery.getState().ready) {
    return
  }
  useGallery.setState({panel: null})
  galleryEvents.dispatchEvent(new CustomEvent('view', {detail: id}))
}

export function importRejected() {
  notify('Choose PNG, JPEG, WebP, AVIF or GIF under 25 mb. Animated images are displayed as a still.')
}

export function resetGallery() {
  playerSession.restore(playerSpawn)
  // A new game state rolls a new environment; undo brings back the previous one along with its collection.
  const seed = rollSeed()
  useGallery.getState().commit(defaultPortraits(seed), seed)
  useGallery.setState(s => ({
    active: null,
    activeLabel: null,
    importEpoch: s.importEpoch + 1,
    resetEpoch: s.resetEpoch + 1,
  }))
  stopNarration()
  galleryEvents.dispatchEvent(new Event('home'))
  notify('Back to the beginning. Your previous collection is one Undo away.')
}

export function startNewGame() {
  if (!useGallery.getState().ready) {
    return
  }
  resetGallery()
  enterGallery()
}

export async function loadBlob(source: Blob | string) {
  if (source instanceof Blob) {
    return source
  }
  const response = await fetch(source)
  if (!response.ok) {
    throw new Error('The artwork could not be loaded.')
  }
  return response.blob()
}

export function newPortrait(source: Blob, title: string, width: number, height: number, pose: {
  direction: Vec3
  position: Vec3
} = cameraPose): Portrait {
  const d = pose.direction
  const p = pose.position
  return {
    id: composeId(),
    title,
    creator: 'You · guest artist',
    description: 'A new arrival. Every collection starts with a little curiosity.',
    source,
    position: [p[0] + d[0] * 1.6, Math.max(placement.floorHeight([p[0] + d[0] * 1.6, p[1], p[2] + d[2] * 1.6]) + 0.8, p[1] + d[1] * 1.6), p[2] + d[2] * 1.6],
    rotation: Math.atan2(-d[0], -d[2]),
    width,
    height,
    hung: false,
    imported: true,
  }
}

export function isTextInput(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || !!target.closest('input, textarea, select'))
}

export function setApiKey(key: string) {
  try {
    if (key) {
      sessionStore().setItem('slop-gallery-key', key)
    } else {
      sessionStore().removeItem('slop-gallery-key')
    }
  } catch {
    notify('Tab storage is unavailable. The key will only stay in memory.')
  }
  useGallery.setState({apiKey: key})
}

export function handleGalleryKey(event: KeyboardEvent) {
  if (isTextInput(event.target) || event.defaultPrevented) {
    return
  }
  if ((event.ctrlKey || event.metaKey) && (event.code === 'KeyZ' || event.code === 'KeyY')) {
    event.preventDefault()
    changeHistory(event.code === 'KeyY' || event.shiftKey)
    return
  }
  const s = useGallery.getState()
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || s.panel) {
    return
  }
  if (event.code === 'KeyM') {
    useGallery.setState({sound: !s.sound})
  }
  // The aim dot only shows while playing, so the toggle is limited to that too and gives immediate visual feedback.
  if (event.code === crosshairToggleKey && s.locked && !s.dragging) {
    crosshair.toggle()
  }
  if (event.code === hiddenUiKey && isDevelopmentMode) {
    toggleHiddenUi()
  }
  if (event.code === graphicsTuningKey && isDevelopmentMode) {
    toggleGraphicsTuning()
  }
  if (event.code === flyModeKey && isDevelopmentMode && s.locked) {
    notify(toggleFlyMode() ? 'Flying. W follows your gaze, Space and C rise and sink, F lands.' : 'Landed. Gravity is back.')
  }
  if (event.code === bookmarkKey && isDevelopmentMode && s.locked) {
    teleportToNextBookmark(event.shiftKey)
  }
}

export async function importDroppedFiles(files: Array<File>, x: number, y: number) {
  const s = useGallery.getState()
  return s.importFiles?.(files, s.panel ? undefined : s.importTarget?.(x, y))
}

function changeHistory(redone = false) {
  galleryEvents.dispatchEvent(new Event('cancel-interaction'))
  galleryEvents.dispatchEvent(new Event('cancel-view'))
  if (redone ? redo() : undo()) {
    notify(redone ? 'Redone. A second thought about your second thought.' : 'Undone. Even happy accidents are reversible.')
  }
}
