import type {NarrationState} from '#src/lib/gallery.ts'

import NarrationActivity from './NarrationActivity.tsx'

export default function NarrationIndicator({title, status, source}: {title: string} & Pick<NarrationState, 'source' | 'status'>) {
  const playing = source === 'browser' ? 'Browser voice playing' : 'Narrator playing'
  return <aside className="narration-indicator" aria-label="Audio guide">
    <NarrationActivity status={status} source={source}/>
    <div role="status"><small>{status === 'preparing' ? 'Preparing narration…' : playing}</small><span title={title}>{title}</span></div>
  </aside>
}
