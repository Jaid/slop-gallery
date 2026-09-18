import Branch from 'branch-component'
import useNarrator, {narrationState} from 'use-narrator'

import AimDot from '#component/AimDot'
import ArtworkOverlay from '#component/ArtworkOverlay'
import NarrationIndicator from '#component/NarrationIndicator'
import {narrator} from '#src/lib/audio/narration.ts'
import {useGallery} from '#src/lib/gallery.ts'

export default function Hud() {
  const s = useGallery()
  const narration = narrationState(useNarrator(narrator))
  const artwork = s.held ? undefined : s.portraits.find(p => p.id === s.activeLabel && p.hung && !p.reserved)
  return <Branch if={s.locked} none={[s.panel, s.dragging]}>
    <AimDot />
    <Branch if={artwork}><ArtworkOverlay portrait={artwork!} /></Branch>
    <Branch if={narration}><NarrationIndicator source={narration?.source ?? null} status={narration?.status ?? 'preparing'} title={narration?.title ?? ''} /></Branch>
  </Branch>
}
