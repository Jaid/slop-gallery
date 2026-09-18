import type {NarrationState} from 'use-narrator/core'

import NarrationActivity from '#component/NarrationActivity'

import css from './style.module.sass'

export default function NarrationIndicator({title, status, source}: {title: string} & Pick<NarrationState, 'source' | 'status'>) {
  const label = {
    preparing: 'Preparing narration…',
    before: 'Narrator starting…',
    playing: source === 'browser' ? 'Browser voice playing' : 'Narrator playing',
    after: 'Narration finished',
  }[status]
  return <aside aria-label='Audio guide' className={css.container}>
    <NarrationActivity source={source} status={status} />
    <div role='status'><small>{label}</small><span title={title}>{title}</span></div>
  </aside>
}
