import type {EgoDump} from 'ego-player'

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
