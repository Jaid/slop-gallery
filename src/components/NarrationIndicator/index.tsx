import type {NarrationState} from 'use-narrator/core'

import NarrationActivity from '#component/NarrationActivity'

import css from './style.module.sass'

type Props = Pick<NarrationState, 'instanceId' | 'source' | 'status' | 'title'>

export default function NarrationIndicator({instanceId, title, status, source}: Props) {
  const label = {
    preparing: 'Preparing narration…',
    before: 'Narrator starting…',
    playing: source === 'browser' ? 'Browser voice playing' : 'Narrator playing',
    after: 'Narration finished',
  }[status]
  return <aside aria-label='Audio guide' className={css.container}>
    <NarrationActivity instanceId={instanceId} source={source} status={status} />
    <div role='status'><small>{label}</small><span title={title}>{title}</span></div>
  </aside>
}

export function NarrationIndicatorStack({narrations}: {narrations: ReadonlyArray<NarrationState>}) {
  if (!narrations.length) {
    return null
  }
  return <div className={css.stack} data-testid='narration-stack'>
    {narrations.map(narration => <NarrationIndicator instanceId={narration.instanceId} key={narration.instanceId} source={narration.source} status={narration.status} title={narration.title} />)}
  </div>
}
