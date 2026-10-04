import type {ReactNode} from 'react'

import {createContext, useContext} from 'react'

export type GraphicsModeProviderProps = {
  children: ReactNode
  isHeavy: boolean
  onChange: (isHeavy: boolean) => void
}

const ModeContext = createContext<boolean | null>(null)
const ChangeContext = createContext<GraphicsModeProviderProps['onChange'] | null>(null)

/** Controlled state: the application owns defaults, persistence and transitions. */
export function GraphicsModeProvider({children, isHeavy, onChange}: GraphicsModeProviderProps) {
  return <ModeContext value={isHeavy}><ChangeContext value={onChange}>{children}</ChangeContext></ModeContext>
}

/** Read whether heavy graphics are enabled without subscribing to the change callback. */
export default function useGraphicsMode() {
  const isHeavy = useContext(ModeContext)
  if (isHeavy === null) {
    throw new Error('useGraphicsMode requires a GraphicsModeProvider.')
  }
  return isHeavy
}

/** Format a boolean for labels or serialization; no React provider is required. */
useGraphicsMode.getName = (isHeavy: boolean) => {
  return isHeavy ? 'heavy' : 'fast'
}

/** Request a change; the provider’s owner decides when to commit the boolean. */
export function useSetGraphicsMode() {
  const onChange = useContext(ChangeContext)
  if (onChange === null) {
    throw new Error('useSetGraphicsMode requires a GraphicsModeProvider.')
  }
  return onChange
}

/** Derive a value from isHeavy without enum keys, cloning or implicit resource ownership. */
export function useGraphicsModeValue<Value>(select: (isHeavy: boolean) => Value): Value {
  return select(useGraphicsMode())
}
