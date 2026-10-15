import Branch from 'branch-component'
import useNarrator, {narrationStates} from 'use-narrator'

import AimDot from '#component/AimDot'
import ArtworkOverlay from '#component/ArtworkOverlay'
import InteractionHint from '#component/InteractionHint'
import {NarrationIndicatorStack} from '#component/NarrationIndicator'
import {narrator} from '#src/lib/audio/narration.ts'
import {readCrosshair} from '#src/lib/crosshair.ts'
import {useGallery} from '#src/lib/gallery.ts'

const crosshair = readCrosshair()

export default function Hud() {
  const s = useGallery()
  const narrations = narrationStates(useNarrator(narrator))
  const artwork = s.held ? undefined : s.portraits.find(p => p.id === s.activeLabel && p.hung && !p.reserved)
  return <Branch if={s.locked} none={[s.panel, s.dragging]}>
    <Branch if={crosshair} then={AimDot} />
    <Branch if={artwork}><ArtworkOverlay portrait={artwork!} /></Branch>
    <InteractionHint />
    <NarrationIndicatorStack narrations={narrations} />
  </Branch>
}
