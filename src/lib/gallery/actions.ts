import type {Panel} from './store.ts'
import type {Portrait, Vec3} from './types.ts'

import {SoundEngine} from '../audio/SoundEngine.ts'
import {initialPortraits} from './collection.ts'
import {playerSession, playerSpawn} from './PlayerSession.ts'
import {redo, undo, useGallery} from './store.ts'
import {floorHeight} from './walls.ts'

export const cameraPose = {
  focused: false,
  position: [playerSpawn.position[0], playerSpawn.position[1] + 1.6, playerSpawn.position[2]] as Vec3,
  direction: [-Math.sin(playerSpawn.yaw) * Math.cos(playerSpawn.pitch), Math.sin(playerSpawn.pitch), -Math.cos(playerSpawn.yaw) * Math.cos(playerSpawn.pitch)] as Vec3,
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
  galleryEvents.dispatchEvent(new Event('release-pointer'))
  document.exitPointerLock?.()
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
  const lock = document.querySelector('canvas')?.requestPointerLock()
  if (lock) {
    void lock.catch(() => notify('Click the gallery to begin exploring.'))
  }
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

export function stopNarration() {
  galleryEvents.dispatchEvent(new Event('stop-narration'))
}

export function requestMerge(first: string, second: string) {
  galleryEvents.dispatchEvent(new CustomEvent('merge', {detail: [first, second]}))
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
  useGallery.getState().commit(initialPortraits.map(p => ({...p})))
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

export function newPortrait(source: Blob, title: string, width: number, height: number, pose: {direction: Vec3
  position: Vec3} = cameraPose): Portrait {
  const d = pose.direction
  const p = pose.position
  return {
    id: crypto.randomUUID(),
    title,
    creator: 'You · guest artist',
    description: 'A new arrival. Every collection starts with a little curiosity.',
    source,
    position: [p[0] + d[0] * 1.6, Math.max(floorHeight([p[0] + d[0] * 1.6, p[1], p[2] + d[2] * 1.6]) + 0.8, p[1] + d[1] * 1.6), p[2] + d[2] * 1.6],
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
      sessionStorage.setItem('slop-gallery-key', key)
    } else {
      sessionStorage.removeItem('slop-gallery-key')
    }
  } catch {
    notify('Tab storage is unavailable. The key will only stay in memory.')
  }
  useGallery.setState({apiKey: key})
}

export function changeHistory(redone = false) {
  galleryEvents.dispatchEvent(new Event('cancel-interaction'))
  galleryEvents.dispatchEvent(new Event('cancel-view'))
  if (redone ? redo() : undo()) {
    notify(redone ? 'Redone. A second thought about your second thought.' : 'Undone. Even happy accidents are reversible.')
  }
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
}

export async function importDroppedFiles(files: Array<File>, x: number, y: number) {
  const s = useGallery.getState()
  return s.importFiles?.(files, s.panel ? undefined : s.importTarget?.(x, y))
}
