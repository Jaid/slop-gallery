import type {Panel} from './store.ts'
import type {Portrait, Vec3} from './types.ts'

import {SoundEngine} from '../audio/SoundEngine.ts'
import {initialPortraits} from './collection.ts'
import {useGallery} from './store.ts'

export const cameraPose = {
  focused: false,
  position: [0, 1.7, 5.8] as Vec3,
  direction: [0, 0, -1] as Vec3,
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
  void SoundEngine.get().resume()
  void document.querySelector('canvas')?.requestPointerLock()?.catch(() => notify('Click the gallery to begin exploring.'))
}

export function chime(frequency = 320) {
  if (useGallery.getState().sound) {
    SoundEngine.get().tone(frequency)
  }
}

export function narrate(id: string) {
  void SoundEngine.get().resume()
  galleryEvents.dispatchEvent(new CustomEvent('narrate', {detail: id}))
}

export function stopNarration() {
  galleryEvents.dispatchEvent(new Event('stop-narration'))
}

export function requestMerge(first: string, second: string) {
  galleryEvents.dispatchEvent(new CustomEvent('merge', {detail: [first, second]}))
}

export function viewPortrait(id: string) {
  useGallery.setState({panel: null})
  galleryEvents.dispatchEvent(new CustomEvent('view', {detail: id}))
}

export function upload() {
  document.exitPointerLock?.()
  document.querySelector<HTMLInputElement>('input[data-artwork-input]')?.click()
}

export function importRejected() {
  notify('Choose PNG, JPEG, WebP, AVIF or GIF under 25 mb. Animated images are displayed as a still.')
}

export function resetGallery() {
  useGallery.getState().commit(initialPortraits.map(p => ({...p})))
  useGallery.setState(s => ({active: null, activeLabel: null, importEpoch: s.importEpoch + 1, resetEpoch: s.resetEpoch + 1}))
  stopNarration()
  galleryEvents.dispatchEvent(new Event('home'))
  notify('Back to the beginning. Your previous collection is one Undo away.')
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
    position: [p[0] + d[0] * 1.6, Math.max(0.8, p[1] + d[1] * 1.6), p[2] + d[2] * 1.6],
    rotation: Math.atan2(-d[0], -d[2]),
    width,
    height,
    hung: false,
    imported: true,
  }
}

export function isTextInput(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || !!target.closest('input, textarea, select, dialog, [role="dialog"]'))
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
