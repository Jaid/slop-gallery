import type {PropsWithChildren} from 'react'

import clsx from 'clsx'

import css from './style.module.sass'

export default function Toast({children, panel}: PropsWithChildren<{panel?: boolean}>) {
  return <div className={clsx(css.container, panel && css.inPanel)} role="status">{children}</div>
}
