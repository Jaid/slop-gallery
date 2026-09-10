import Icon from '#component/Icon'
import {upload} from '#src/lib/gallery.ts'

import css from './style.module.sass'

export default function UploadArtwork() {
  return <button className={css.container} onClick={upload}><Icon name="plus"/><strong>Add artwork</strong><span>Choose images from your device</span></button>
}
