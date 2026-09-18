import type {NarrationState} from 'use-narrator/core'

import Icon from '#component/Icon'
import NarrationBars from '#component/NarrationBars'

import css from './style.module.sass'

export default function NarrationActivity({status, source}: Pick<NarrationState, 'source' | 'status'>) {
  if (source === 'audio' && status === 'playing') {
    return <NarrationBars />
  }
  let title = 'Preparing narration…'
  if (status === 'before') {
    title = 'Narration starts shortly.'
  } else if (status === 'after') {
    title = 'Narration finished.'
  } else if (source === 'browser') {
    title = 'Browser speech has no audio visualization.'
  }
  return <span aria-hidden='true' className={css.container} data-testid='narration-static' title={title}><Icon name='sound' size={22} /></span>
}
