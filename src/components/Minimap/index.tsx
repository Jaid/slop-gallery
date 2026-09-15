import {Minimap as LevelMinimap} from '#level/components.ts'

import css from './style.module.sass'

export default function Minimap({lower}: {lower: boolean}) {
  return <section aria-label={lower ? 'Lower gallery map' : 'Upper gallery map'} className={css.container} data-testid='minimap'>
    <LevelMinimap lower={lower} />
  </section>
}
