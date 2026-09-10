import {useGallery} from '#src/lib/gallery.ts'

import css from './style.module.sass'

export default function AtmosphereSettings() {
  const s = useGallery()
  return <section className={css.container}><div className={css.heading}>Atmosphere</div>
    <span className={css.fieldLabel}>Lobby wall palette</span><div className={css.swatches}>{(['ivory', 'sage', 'nocturne'] as const).map(theme => <button aria-pressed={s.theme === theme} className={s.theme === theme ? css.chosen : undefined} onClick={() => useGallery.setState({theme})} key={theme}><i style={{background: theme === 'ivory' ? '#e7dfcc' : theme === 'sage' ? '#a4b7a6' : '#536571'}}/>{theme}</button>)}</div>
    <span className={css.fieldLabel}>Frame finish</span><div className={css.segmented}>{(['gold', 'oak', 'black'] as const).map(frame => <button key={frame} aria-pressed={s.frame === frame} className={s.frame === frame ? css.chosen : undefined} onClick={() => useGallery.setState({frame})}>{frame}</button>)}</div>
    <label className={css.toggleRow}>Sound<input type="checkbox" checked={s.sound} onChange={event => useGallery.setState({sound: event.target.checked})}/></label>
  </section>
}
