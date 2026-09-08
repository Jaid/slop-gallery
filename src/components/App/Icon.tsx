import type {ReactNode} from 'react'

export default function Icon({name, size = 20}: {name: string
  size?: number}) {
  const paths: Record<string, ReactNode> = {
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    map: <><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5zm6-2v16m6-14v16"/></>,
    undo: <path d="M3 10h10a7 7 0 0 1 0 14M3 10l5-5m-5 5 5 5"/>,
    plus: <path d="M12 5v14M5 12h14" />,
    sound:
      <>
        <path d="m11 4-6 5H2v6h3l6 5zM15 8c3 2 3 6 0 8M18 4c6 4 6 12 0 16" />
      </>,
    mute:
      <>
        <path d="m11 4-6 5H2v6h3l6 5zM16 9l6 6m0-6-6 6" />
      </>,
    settings:
      <>
        <path d="M4 7h16M4 17h16" />
        <circle cx="8" cy="7" r="3" />
        <circle cx="16" cy="17" r="3" />
      </>,
    grid:
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    spark:
      <>
        <path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3zM21 2v4m-2-2h4" />
      </>,
    help:
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 8a3 3 0 0 1 6 1c0 2-3 2-3 5m0 3v.2" />
      </>,

  }
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
      {paths[name] || paths.spark}
    </svg>
  )
}
