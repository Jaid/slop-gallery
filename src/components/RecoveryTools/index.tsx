import {openPanel} from '#src/lib/gallery.ts'

import css from './style.module.sass'

export default function RecoveryTools() {
  return <nav className={css.container} aria-label="Gallery recovery"><button className={css.textButton} onClick={() => openPanel('collection')}>Collection</button><button className={css.textButton} onClick={() => openPanel('settings')}>Preferences & backups</button><button className={css.textButton} onClick={() => openPanel('help')}>Controls</button></nav>
}
