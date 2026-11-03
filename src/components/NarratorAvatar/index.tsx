import css from './style.module.sass'

/** The narrator as the gallery’s own “Son of Man”, a bowler-hatted gentleman with a slop of slime in front of his face. */
export default function NarratorAvatar() {
  return <svg className={css.container} aria-hidden='true' data-testid='narrator-avatar' viewBox='0 0 64 64'>
    <path d='M28 36h8v12h-8Z' fill='#b27a5c' />
    <path d='M4 64c2-10 10-15 20-17h16c10 2 18 7 20 17Z' fill='#2a2d33' />
    <path d='M25 47h14l-7 12Z' fill='#f2f0ea' />
    <path d='M31 50h2l1.5 9h-5Z' fill='#b8322a' />
    <ellipse cx='22.5' cy='30' fill='#d9a07e' rx='2.5' ry='4' />
    <ellipse cx='41.5' cy='30' fill='#d9a07e' rx='2.5' ry='4' />
    <ellipse cx='32' cy='30' fill='#e5b08a' rx='9.5' ry='12' />
    <path d='M22.5 20c-1-8 2-13 9.5-13s10.5 5 9.5 13Z' fill='#2c2c31' />
    <path d='M22.4 17.5h19.2V20H22.4Z' fill='#45454c' />
    <path d='M17 20.5c0-1.5 3-2 6-1.5 3 .5 6 .8 9 .8s6-.3 9-.8 6 0 6 1.5c-.5 1.5-4 2.5-8 3-2.5.3-4.5.4-7 .4s-4.5-.1-7-.4c-4-.5-7.5-1.5-8-3Z' fill='#1c1c1f' />
    <path d='M25.5 30.5c0-4.5 2.8-7 6.5-7s6.5 2.5 6.5 7c0 2.5-1 4.2-2.5 5.3V40a1 1 0 0 1-2 0v-3.2c-1.4.4-2.6.4-4 0v1.4a1 1 0 0 1-2 0v-2.4c-1.5-1.1-2.5-2.8-2.5-5.3Z' fill='#6fbf2a' />
    <ellipse cx='29.3' cy='27.2' fill='#fff' opacity='0.8' rx='1.8' ry='1' transform='rotate(-30 29.3 27.2)' />
  </svg>
}
