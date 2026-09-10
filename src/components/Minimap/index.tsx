import MinimapLevel from '#component/MinimapLevel'

import css from './style.module.sass'

export default function Minimap() {
  return <section className={css.container} aria-label="Minimap" data-testid="minimap">
    <MinimapLevel lower={false}/>
    <MinimapLevel lower/>
  </section>
}
