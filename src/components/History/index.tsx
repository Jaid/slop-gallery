import {changeHistory, useGallery} from '#src/lib/gallery.ts'

import css from './style.module.sass'

export default function History() {
  const canUndo = useGallery(s => s.past.length > 0)
  const canRedo = useGallery(s => s.future.length > 0)
  return <div className={css.container} role="group" aria-label="Collection history"><button className={css.textButton} disabled={!canUndo} onClick={() => changeHistory()}>Undo</button><button className={css.textButton} disabled={!canRedo} onClick={() => changeHistory(true)}>Redo</button></div>
}
