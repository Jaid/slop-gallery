import type {EgoDump} from 'ego-player'

import stringifyClank from 'stringify-clank'

import {playSoundEffect} from '../audio/soundEffects.ts'
import SoundEngine from '../audio/SoundEngine.ts'
import {isDevelopmentMode} from '../developmentMode.ts'
import {useGallery} from '../gallery.ts'
import {galleryLevel, galleryTitle} from '../level.ts'
import readQueryOverrides from '../queryOverrides.ts'
import {telemetry} from './index.ts'
import saveDumpScreenshot from './saveDumpScreenshot.ts'

export type PlayerDumpSnapshot = ReturnType<typeof snapshotPlayerDump>

/** The mounted player’s on-demand dump, set by the Player component. */
export const playerDumps: {capture: (() => EgoDump | null) | null} = {capture: null}

/** Attach the gallery context and query overrides to an ego-player dump, as printed and copied for X dumps. */
export function snapshotPlayerDump(dump: EgoDump) {
  const {room, active, held, inspecting, locked} = useGallery.getState()
  const sessionId = telemetry?.sessionId
  const context = {
    level: galleryLevel,
    room,
    // Nothing active, held or inspected is the common case, so those only appear when set.
    ...active === null ? {} : {active},
    ...held === null ? {} : {held},
    ...inspecting === null ? {} : {inspecting},
    locked,
    ...sessionId ? {sessionId} : {},
    // The camera already carries fov and aspect; the CSS viewport adds the absolute size.
    ...typeof window === 'undefined' ? {} : {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    },
  }
  const query = readQueryOverrides()
  return {
    ...dump,
    context,
    ...query ? {query} : {},
  }
}

/** Log an X-key dump, copy it to the clipboard as Clank, confirm it audibly and download the current frame. Only wired up in development mode, see `playerDumpHandler`. */
export default function recordPlayerDump(dump: EgoDump) {
  const snapshot = snapshotPlayerDump(dump)
  const {context} = snapshot
  console.dir(snapshot, {depth: null})
  const {id, time, ...rest} = snapshot
  copyDump(`<details><summary>session from ${formatLocalTime(new Date(time))} in ${galleryTitle}</summary><dump id=${id} date="${time}">${stringifyClank(rest)}</dump></details>`).catch(error => {
    console.warn('Dump could not be copied to the clipboard.', error)
  })
  if (useGallery.getState().sound) {
    confirmDump().catch(error => {
      console.warn('Dump confirmation sound could not be played.', error)
    })
  }
  saveDumpScreenshot(`${galleryLevel}-${dump.id}`).catch(error => {
    console.warn('Dump screenshot could not be captured.', error)
  })
  if (!telemetry) {
    return
  }
  const attributes = {
    'dump.id': dump.id,
    room: context.room,
    'event.name': 'ego.dump',
  }
  // Keep arbitrarily deep sightlines out of one oversized OTLP record. Join hits by dump.id.
  telemetry.log(JSON.stringify({
    ...dump,
    context,
    hits: undefined,
    hit: dump.hits[0] ?? null,
    hitCount: dump.hits.length,
  }), {
    level: 'info',
    attributes,
  })
  for (const [index, hit] of dump.hits.entries()) {
    telemetry.log(JSON.stringify(hit), {
      level: 'info',
      attributes: {
        ...attributes,
        'event.name': 'ego.dump.hit',
        'hit.index': index,
      },
    })
  }
}

/** The player’s `onDump` handler: X only dumps with `?development`, otherwise ego-player ignores the key and skips its diagnostic raycaster. */
export const playerDumpHandler = isDevelopmentMode ? recordPlayerDump : undefined

async function confirmDump() {
  const sound = SoundEngine.get()
  await sound.resume()
  if (useGallery.getState().sound) {
    playSoundEffect(sound, 'SFX-04')
  }
}
async function copyDump(text: string) {
  await navigator.clipboard.writeText(text)
  console.info(`Dump copied to the clipboard as Clank (${text.length} characters).`)
}
function pad(value: number) {
  return String(value).padStart(2, '0')
}
function formatLocalTime(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
