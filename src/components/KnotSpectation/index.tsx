import type {KnotBay} from 'knot-materials/exhibition.ts'

import knotAnnouncementUrl from 'knot-materials/announcementAssets.ts'
import {knotBays, knotExhibition} from 'knot-materials/exhibition.ts'
import {useEffect} from 'react'

import KnotNarration from '#src/lib/audio/KnotNarration.ts'
import {narrator} from '#src/lib/audio/narration.ts'
import {galleryEvents, useGallery} from '#src/lib/gallery.ts'

const exhibits = new Map(knotExhibition.map(item => [`prop-knot-${item.id}`, item]))
const candidateSurfaces = new Map<string, KnotBay>(knotBays.flatMap(bay => [[`preview-${bay.candidate.id}`, bay], [`candidate-sign-${bay.candidate.id}`, bay]] as const))

/** Inspecting a Knot announces it, as does asking for its or a candidate’s narration. */
export default function KnotSpectation() {
  useEffect(() => {
    const owner = new AbortController
    const announcements = new KnotNarration(narrator, knotAnnouncementUrl)
    const announce = (id: string, repeat = false) => {
      if (!useGallery.getState().sound) {
        return
      }
      const item = exhibits.get(id)
      const candidateBay = candidateSurfaces.get(id)
      const options = {
        id,
        repeat,
        signal: owner.signal,
      }
      if (candidateBay) {
        announcements.enqueueCandidate(candidateBay.candidate, options)
      } else if (item) {
        announcements.enqueue(item, options)
      }
    }
    const inspect = (event: Event) => announce((event as CustomEvent<string>).detail)
    const narrate = (event: Event) => announce((event as CustomEvent<string>).detail, true)
    const narrateModel = (event: Event) => {
      const id = (event as CustomEvent<string>).detail
      const item = exhibits.get(id)
      if (item && useGallery.getState().sound) {
        announcements.enqueueModel(item, {
          id,
          signal: owner.signal,
        })
      }
    }
    galleryEvents.addEventListener('inspect', inspect)
    galleryEvents.addEventListener('narrate', narrate)
    galleryEvents.addEventListener('narrate-model', narrateModel)
    return () => {
      galleryEvents.removeEventListener('inspect', inspect)
      galleryEvents.removeEventListener('narrate', narrate)
      galleryEvents.removeEventListener('narrate-model', narrateModel)
      owner.abort()
    }
  }, [])
  return null
}
