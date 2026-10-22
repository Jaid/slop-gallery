import {create} from 'zustand'

/** key that hides or shows all UI with `?development`, from the HUD, notices and pause menu to the light and portrait slot markers */
export const hiddenUiKey = 'KeyO'

/** Whether the player hid all UI with O, for clean views of the scene, for the rest of the page session. */
export const useHiddenUi = create<{hidden: boolean}>(() => ({hidden: false}))

/** Hides all UI or brings it back, returning whether it is hidden now. */
export function toggleHiddenUi() {
  const hidden = !useHiddenUi.getState().hidden
  useHiddenUi.setState({hidden})
  return hidden
}
