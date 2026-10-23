import type {ReactNode} from 'react'

import {createContext, use} from 'react'

export type GraphicsModeProviderProps = {
  children: ReactNode
  /** whether heavy graphics are meant for non-realtime rendering; only takes effect while `isHeavy` is set */
  isCinematic?: boolean
  isHeavy: boolean
  onChange: (isHeavy: boolean) => void
}

type Mode = {
  isCinematic: boolean
  isHeavy: boolean
}

const ModeContext = createContext<Mode | null>(null)
const ChangeContext = createContext<GraphicsModeProviderProps['onChange'] | null>(null)
const modes = {
  fast: {
    isHeavy: false,
    isCinematic: false,
  },
  heavy: {
    isHeavy: true,
    isCinematic: false,
  },
  cinematic: {
    isHeavy: true,
    isCinematic: true,
  },
} as const satisfies Record<string, Mode>

/** Controlled state: the application owns defaults, persistence and transitions. */
export function GraphicsModeProvider({children, isCinematic = false, isHeavy, onChange}: GraphicsModeProviderProps) {
  const mode = isHeavy ? (isCinematic ? modes.cinematic : modes.heavy) : modes.fast
  return <ModeContext value={mode}><ChangeContext value={onChange}>{children}</ChangeContext></ModeContext>
}

const useMode = (hook: string) => {
  const mode = use(ModeContext)
  if (mode === null) {
    throw new Error(`${hook} requires a GraphicsModeProvider.`)
  }
  return mode
}

/** Read whether heavy graphics are enabled without subscribing to the change callback. Cinematic graphics are heavy too. */
export default function useGraphicsMode() {
  return useMode('useGraphicsMode').isHeavy
}

/** Format the mode for labels or serialization; no React provider is required. */
useGraphicsMode.getName = (isHeavy: boolean, isCinematic = false) => {
  if (!isHeavy) {
    return 'fast'
  }
  return isCinematic ? 'cinematic' : 'heavy'
}

/** Read whether heavy graphics are meant for non-realtime rendering, which may spend far more per frame than heavy. */
export function useCinematicGraphics() {
  return useMode('useCinematicGraphics').isCinematic
}

/** Request a change; the provider’s owner decides when to commit the boolean. */
export function useSetGraphicsMode() {
  const onChange = use(ChangeContext)
  if (onChange === null) {
    throw new Error('useSetGraphicsMode requires a GraphicsModeProvider.')
  }
  return onChange
}

/** Derive a value from isHeavy and isCinematic without enum keys, cloning or implicit resource ownership. */
export function useGraphicsModeValue<Value>(select: (isHeavy: boolean, isCinematic: boolean) => Value): Value {
  const {isCinematic, isHeavy} = useMode('useGraphicsModeValue')
  return select(isHeavy, isCinematic)
}
