import type {PropsWithChildren} from 'react'

import css from './style.module.sass'

export default function RenderError({children}: PropsWithChildren) {
  return <main className={css.container} data-testid="render-error" role="alert">{children}</main>
}
