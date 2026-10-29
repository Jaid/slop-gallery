import {Suspense} from 'react'

import world from '#src/worlds/current.ts'

import css from './style.module.sass'

const {Minimap: WorldMinimap} = world

export default function Minimap({lower}: {lower: boolean}) {
  return <section className={css.container} aria-label={lower ? 'Lower gallery map' : 'Upper gallery map'} data-testid='minimap'>
    <Suspense><WorldMinimap lower={lower} /></Suspense>
  </section>
}
