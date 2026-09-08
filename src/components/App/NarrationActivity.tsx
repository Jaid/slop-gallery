import type {NarrationState} from '#src/lib/gallery.ts'

import Icon from './Icon.tsx'
import NarrationBars from './NarrationBars.tsx'

export default function NarrationActivity({status, source}: Pick<NarrationState, 'status' | 'source'>) {
  if (source === 'audio' && status === 'playing') return <NarrationBars status={status}/>
  return <span className="narration-static" title={source === 'browser' ? 'Browser speech has no audio visualization.' : 'Preparing narration…'} aria-hidden="true"><Icon name="sound" size={22}/></span>
}
