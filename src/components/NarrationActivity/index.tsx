import type {NarrationState} from 'use-narrator/core'

import Icon from '#component/Icon'
import NarrationBars from '#component/NarrationBars'

import css from './style.module.sass'

export default function NarrationActivity({instanceId, status, statusEndsAt, source}: Pick<NarrationState, 'instanceId' | 'source' | 'status' | 'statusEndsAt'>) {
  if (source === 'audio') {
    return <NarrationBars instanceId={instanceId} status={status} statusEndsAt={statusEndsAt} />
  }
  let title = 'Preparing narration…'
  if (status === 'before') {
    title = 'Narration starts shortly.'
  } else if (status === 'after') {
    title = 'Narration finished.'
  } else if (source === 'browser') {
    title = 'Browser speech has no audio visualization.'
  }
  return <span className={css.container} aria-hidden='true' data-testid='narration-static' title={title}><Icon name='sound' size={44} /></span>
}
