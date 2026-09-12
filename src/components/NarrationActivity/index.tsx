import type {NarrationState} from '#src/lib/gallery.ts'

import Icon from '#component/Icon'
import NarrationBars from '#component/NarrationBars'

import css from './style.module.sass'

export default function NarrationActivity({status, source}: Pick<NarrationState, 'source' | 'status'>) {
  if (source === 'audio' && status === 'playing') {
    return <NarrationBars/>
  }
  return <span className={css.container} data-testid="narration-static" title={source === 'browser' ? 'Browser speech has no audio visualization.' : 'Preparing narration…'} aria-hidden="true"><Icon name="sound" size={22}/></span>
}
