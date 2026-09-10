export type PauseMenuStage = 'first' | 'pause' | 'return' | 'unfocus'
export type PauseMenuSnapshot = Readonly<{
  locked: boolean
  /** The last menu stage remains available while playing. */
  stage: PauseMenuStage
}>
export type PauseReason = Extract<PauseMenuStage, 'pause' | 'unfocus'>
export type VisitStorage = Pick<Storage, 'getItem' | 'setItem'>
export type PauseMenuOptions = {
  /** Defaults to first; return can be supplied for application-specific migrations. */
  initialStage?: 'first' | 'return'
  /** Resolved lazily by start(), never during construction or server rendering. */
  storage?: () => VisitStorage | undefined
  /** Omit to keep visit tracking in memory only. Use a different key for each game. */
  storageKey?: string
}
