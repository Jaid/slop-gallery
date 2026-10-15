const buttonPaths = {
  left: 'M8 1.75A6.25 6.25 0 0 0 1.75 8V9H8Z',
  right: 'M8 1.75A6.25 6.25 0 0 1 14.25 8V9H8Z',
}

/** A mouse outline split into two buttons, with the relevant one filled in. */
export default function MouseIcon({button}: {button: keyof typeof buttonPaths}) {
  return <svg aria-hidden='true' fill='none' height='1.4em' stroke='currentColor' strokeWidth='1.6' viewBox='0 0 16 22' width='1.02em'>
    <path d={buttonPaths[button]} fill='currentColor' stroke='none' />
    <rect height='19.5' rx='6.25' width='12.5' x='1.75' y='1.25' />
    <path d='M8 1.25V9M1.75 9h12.5' />
  </svg>
}
