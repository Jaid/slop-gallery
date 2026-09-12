import type {EgoDump} from 'ego-player'

import {playSoundEffect} from '../audio/soundEffects.ts'
import SoundEngine from '../audio/SoundEngine.ts'
import {useGallery} from '../gallery.ts'
import {galleryLevel} from '../level.ts'
import {telemetry} from './index.ts'

export default function recordPlayerDump(dump: EgoDump) {
  const {room, active, held, inspecting, locked} = useGallery.getState()
  const context = {
    level: galleryLevel,
    room,
    active,
    held,
    inspecting,
    locked,
    sessionId: telemetry?.sessionId ?? null,
  }
  console.dir({
    ...dump,
    context,
  }, {depth: null})
  if (useGallery.getState().sound) {
    void confirmDump()
  }
  if (!telemetry) {
    return
  }
  const attributes = {
    'dump.id': dump.id,
    room,
    'event.name': 'ego.dump',
  }
  // Keep arbitrarily deep sightlines out of one oversized OTLP record. Join hits by dump.id.
  telemetry.log(JSON.stringify({
    ...dump,
    context,
    aim: {
      ...dump.aim,
      hits: undefined,
    },
    hitCount: dump.aim.hits.length,
  }), 'info', attributes)
  for (const [index, hit] of dump.aim.hits.entries()) {
    telemetry.log(JSON.stringify(hit), 'info', {
      ...attributes,
      'event.name': 'ego.dump.hit',
      'hit.index': index,
    })
  }
}

async function confirmDump() {
  try {
    const sound = SoundEngine.get()
    await sound.resume()
    if (useGallery.getState().sound) {
      playSoundEffect(sound, 'SFX-04')
    }
  } catch (error) {
    console.warn('Dump confirmation sound could not be played.', error)
  }
}
