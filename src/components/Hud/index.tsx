import clsx from 'clsx'

import ArtworkOverlay from '#component/ArtworkOverlay'
import NarrationIndicator from '#component/NarrationIndicator'
import {intro} from '#src/lib/audio/Narrator.ts'
import {useGallery} from '#src/lib/gallery.ts'

import css from './style.module.sass'

export default function Hud() {
  const s = useGallery()
  if (!s.locked || s.panel || s.dragging) {
    return null
  }
  const artwork = !s.held && s.portraits.find(p => p.id === s.activeLabel && p.hung && !p.reserved)
  const speaking = s.narration?.id === '__intro' ? intro : s.portraits.find(p => p.id === s.narration?.id)
  return <>
    <div className={clsx(css.crosshair, s.active && css.targeted)} aria-hidden="true"/>
    {artwork && <ArtworkOverlay portrait={artwork}/>}
    {s.narration && speaking && <NarrationIndicator title={speaking.title} status={s.narration.status} source={s.narration.source}/>}
  </>
}
