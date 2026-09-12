import type {ReactNode} from 'react'

const paths = {
  sound: <path d="m11 4-6 5H2v6h3l6 5zM15 8c3 2 3 6 0 8M18 4c6 4 6 12 0 16" />,
  mute: <path d="m11 4-6 5H2v6h3l6 5zM16 9l6 6m0-6-6 6" />,
  settings:
      <>
        <path d="M4 7h16M4 17h16" />
        <circle cx="8" cy="7" r="3" />
        <circle cx="16" cy="17" r="3" />
      </>,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,

} satisfies Record<string, ReactNode>

export default function Icon({name, size = 20}: {name: keyof typeof paths
  size?: number}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}
