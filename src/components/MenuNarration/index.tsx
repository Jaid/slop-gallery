import useNarrator, {narrationState} from 'use-narrator'

import NarrationActivity from '#component/NarrationActivity'
import {narrator} from '#src/lib/audio/narration.ts'
import {stopNarration} from '#src/lib/gallery.ts'

import css from './style.module.sass'

export default function MenuNarration() {
  const narration = narrationState(useNarrator(narrator))
  if (!narration) {
    return null
  }
  return <details className={css.container}>
    <summary><NarrationActivity source={narration.source} status={narration.status} />{narration.title}</summary>
    <p>{narration.text}</p>
    <button className={css.textButton} onClick={stopNarration} type='button'>Stop narration</button>
  </details>
}
