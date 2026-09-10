import NarrationActivity from '#component/NarrationActivity'
import {intro} from '#src/lib/audio/Narrator.ts'
import {stopNarration, useGallery} from '#src/lib/gallery.ts'

import css from './style.module.sass'

export default function MenuNarration() {
  const s = useGallery()
  const speaking = s.narration?.id === '__intro' ? intro : s.portraits.find(p => p.id === s.narration?.id)
  if (!s.narration || !speaking) {
    return null
  }
  return <details className={css.container}>
    <summary><NarrationActivity status={s.narration.status} source={s.narration.source}/>{speaking.title}</summary>
    <p>{speaking.description}</p>
    <button className={css.textButton} onClick={stopNarration}>Stop narration</button>
  </details>
}
