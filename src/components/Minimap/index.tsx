import {Minimap as LevelMinimap} from '#level/components.ts'

import css from './style.module.sass'

export default function Minimap({lower}: {lower: boolean}) {
  return <section className={css.container} aria-label={lower ? 'Lower gallery map' : 'Upper gallery map'} data-testid="minimap">
    <LevelMinimap lower={lower}/>
  </section>
}
