import Branch from 'branch-component'
import clsx from 'clsx'

import ArtworkOverlay from '#component/ArtworkOverlay'
import NarrationIndicator from '#component/NarrationIndicator'
import {intro} from '#src/lib/audio/Narrator.ts'
import {useGallery} from '#src/lib/gallery.ts'

import css from './style.module.sass'

export default function Hud() {
  const s = useGallery()
  const artwork = s.held ? undefined : s.portraits.find(p => p.id === s.activeLabel && p.hung && !p.reserved)
  const speaking = s.narration?.title ? {title: s.narration.title} : s.narration?.id === '__intro' ? intro : s.portraits.find(p => p.id === s.narration?.id)
  return <Branch if={s.locked} none={[s.panel, s.dragging]}>
    <div className={clsx(css.crosshair, s.active && css.targeted)} aria-hidden="true"/>
    <Branch if={artwork}><ArtworkOverlay portrait={artwork!}/></Branch>
    <Branch all={[s.narration, speaking]}><NarrationIndicator title={speaking?.title ?? ''} status={s.narration?.status ?? 'preparing'} source={s.narration?.source ?? null}/></Branch>
  </Branch>
}
