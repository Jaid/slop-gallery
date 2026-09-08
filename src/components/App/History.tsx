import {changeHistory, useGallery} from '#src/lib/gallery.ts'

export default function History() {
  const canUndo = useGallery(s => s.past.length > 0)
  const canRedo = useGallery(s => s.future.length > 0)
  return <div className="detail-actions" role="group" aria-label="Collection history"><button className="text-button" disabled={!canUndo} onClick={() => changeHistory()}>Undo</button><button className="text-button" disabled={!canRedo} onClick={() => changeHistory(true)}>Redo</button></div>
}
