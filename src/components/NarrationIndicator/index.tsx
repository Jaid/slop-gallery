import type {NarrationState} from 'use-narrator/core'

import NarrationActivity from '#component/NarrationActivity'
import NarratorAvatar from '#component/NarratorAvatar'

import css from './style.module.sass'

type Props = Pick<NarrationState, 'instanceId' | 'source' | 'status' | 'statusEndsAt'>

export default function NarrationIndicator({instanceId, status, statusEndsAt, source}: Props) {
  return <aside className={css.container} aria-label='Audio guide'>
    <NarratorAvatar />
    <NarrationActivity instanceId={instanceId} source={source} status={status} statusEndsAt={statusEndsAt} />
  </aside>
}

export function NarrationIndicatorStack({narrations}: {narrations: ReadonlyArray<NarrationState>}) {
  if (!narrations.length) {
    return null
  }
  return <div className={css.stack} data-testid='narration-stack'>
    {narrations.map(narration => <NarrationIndicator key={narration.instanceId} instanceId={narration.instanceId} source={narration.source} status={narration.status} statusEndsAt={narration.statusEndsAt} />)}
  </div>
}
