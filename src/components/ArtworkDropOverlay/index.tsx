import clsx from 'clsx'

import css from './style.module.sass'

const messages = {
  idle: {
    title: 'Make an entrance.',
    description: 'Aim at an empty wall, or drop to place it in front of you.',
  },
  valid: {
    title: 'It would look lovely here.',
    description: 'Drop to hang. The final size is checked before placement.',
  },
  rejected: {
    title: 'Not quite a canvas.',
    description: 'Choose a supported image under 25 mb.',
  },
}

export default function ArtworkDropOverlay({rejected, valid}: {rejected: boolean
  valid: boolean}) {
  let message = messages.idle
  if (rejected) {
    message = messages.rejected
  } else if (valid) {
    message = messages.valid
  }
  return <div className={clsx(css.container, rejected && css.rejected)} data-testid="drop-overlay">
    <div className={css.card}><span className={css.eyebrow}>A NEW ARRIVAL</span><h2>{message.title}</h2>
      <p>{message.description}</p>
      <small>PNG · JPEG · WEBP · AVIF · GIF / UP TO 12 AT ONCE</small></div>
  </div>
}
