import clsx from 'clsx'
import {useSyncExternalStore} from 'react'

import aimDot from '#src/lib/aimDot.ts'
import {useGallery} from '#src/lib/gallery.ts'

import css from './style.module.sass'

export default function AimDot() {
  const visible = useSyncExternalStore(aimDot.subscribe, aimDot.getSnapshot, aimDot.getServerSnapshot)
  const targeted = useGallery(state => state.active !== null)
  return visible ? <div aria-hidden='true' className={clsx(css.dot, targeted && css.targeted)} /> : null
}
