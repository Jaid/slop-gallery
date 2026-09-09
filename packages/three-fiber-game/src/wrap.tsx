import type {ComponentType, ReactNode} from 'react'

export type GameWrapperProps = {children: ReactNode}
export type GameWrapper = ComponentType<GameWrapperProps>
export type GameWrappers = GameWrapper | ReadonlyArray<GameWrapper>

/** The first wrapper is outermost. Never mutate the caller’s array. */
export function wrap(children: ReactNode, wrapper?: GameWrappers): ReactNode {
  const wrappers = Array.isArray(wrapper) ? wrapper : [wrapper]
  let content = children
  for (const Wrapper of wrappers.toReversed()) {
    if (Wrapper) {
      content = <Wrapper>{content}</Wrapper>
    }
  }
  return content
}
