import type {PropsWithChildren} from 'react'

import css from './style.module.sass'

export default function Toast({children}: PropsWithChildren) {
  return <div className={css.container} role='status'>{children}</div>
}
