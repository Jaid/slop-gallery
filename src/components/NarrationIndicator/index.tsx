import type {NarrationState} from 'use-narrator/core'

import NarrationActivity from '#component/NarrationActivity'

import css from './style.module.sass'

type Props = Pick<NarrationState, 'instanceId' | 'source' | 'status' | 'statusEndsAt' | 'title'>

export default function NarrationIndicator({instanceId, title, status, statusEndsAt, source}: Props) {
  return <aside className={css.container} aria-label='Audio guide'>
    <NarrationActivity instanceId={instanceId} source={source} status={status} statusEndsAt={statusEndsAt} />
    <div role='status'><small>Narrator</small><span title={title}>{title}</span></div>
  </aside>
}

export function NarrationIndicatorStack({narrations}: {narrations: ReadonlyArray<NarrationState>}) {
  if (!narrations.length) {
    return null
  }
  return <div className={css.stack} data-testid='narration-stack'>
    {narrations.map(narration => <NarrationIndicator key={narration.instanceId} instanceId={narration.instanceId} source={narration.source} status={narration.status} statusEndsAt={narration.statusEndsAt} title={narration.title} />)}
  </div>
}
