import type {NarrationState} from '#src/lib/gallery.ts'

import NarrationActivity from '#component/NarrationActivity'

import css from './style.module.sass'

export default function NarrationIndicator({title, status, source}: {title: string} & Pick<NarrationState, 'source' | 'status'>) {
  const playing = source === 'browser' ? 'Browser voice playing' : 'Narrator playing'
  return <aside aria-label='Audio guide' className={css.container}>
    <NarrationActivity source={source} status={status} />
    <div role='status'><small>{status === 'preparing' ? 'Preparing narration…' : playing}</small><span title={title}>{title}</span></div>
  </aside>
}
