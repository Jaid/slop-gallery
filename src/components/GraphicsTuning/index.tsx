import type {RenderPipelineSetting, RenderPipelineSettings} from '#src/lib/rendering/renderPipelineSettings.ts'

import Branch from 'branch-component'
import {useEffect} from 'react'
import useGraphicsMode from 'use-graphics-mode'

import {getDefaultCustomGraphics, useCustomGraphics, useGraphicsTuning} from '#src/lib/rendering/customGraphics.ts'
import {changeTunedGraphics, discardTuningBuffer, useTuningBuffer} from '#src/lib/rendering/tuningBuffer.ts'

import css from './style.module.sass'

type BooleanKey = {[Key in RenderPipelineSetting]: RenderPipelineSettings[Key] extends boolean ? Key : never}[RenderPipelineSetting]
type NumberKey = {[Key in RenderPipelineSetting]: RenderPipelineSettings[Key] extends number ? Key : never}[RenderPipelineSetting]
type Control = ({
  key: BooleanKey
  kind: 'toggle'
} | {
  key: NumberKey
  kind: 'range'
  max: number
  min: number
  step: number
} | {
  key: RenderPipelineSetting
  kind: 'select'
  options: Array<[value: RenderPipelineSettings[RenderPipelineSetting], label: string]>
}) & {
  label: string
  /** whether the control does anything with the current settings, beyond its section being switched on */
  when?: (settings: RenderPipelineSettings) => boolean
}
type Section = {
  controls: Array<Control>
  title: string
  /** the pass this section tunes, which its heading switches on and off */
  toggle?: BooleanKey
}

const range = (key: NumberKey, label: string, min: number, max: number, step: number): Control => ({
  key,
  kind: 'range',
  label,
  max,
  min,
  step,
})
const toggle = (key: BooleanKey, label: string): Control => ({
  key,
  kind: 'toggle',
  label,
})
const select = (key: RenderPipelineSetting, label: string, options: Array<[RenderPipelineSettings[RenderPipelineSetting], string]>): Control => ({
  key,
  kind: 'select',
  label,
  options,
})
const scales = (values: Array<number>): Array<[number, string]> => values.map(value => [value, `${value}×`])
const screenSpaceReflections = (settings: RenderPipelineSettings) => settings.reflectionScope === 'all'
const sections: Array<Section> = [
  {
    title: 'Antialiasing',
    controls: [select('antiAliasing', 'Method', [['traa', 'TRAA'], ['smaa', 'SMAA'], [false, 'Off']])],
  },
  {
    title: 'Reflections',
    controls: [
      select('reflectionScope', 'Scope', [['none', 'None'], ['floors', 'Floors'], ['all', 'All']]),
      {
        ...select('reflectionResolutionScale', 'Floor resolution', scales([0.5, 1, 2])),
        when: settings => settings.reflectionScope !== 'none',
      },
      {
        ...select('screenSpaceReflectionResolutionScale', 'SSR resolution', scales([0.25, 0.5, 1])),
        when: screenSpaceReflections,
      },
      {
        ...range('screenSpaceReflectionIntensity', 'SSR intensity', 0, 2, 0.1),
        when: screenSpaceReflections,
      },
      {
        ...range('screenSpaceReflectionDistance', 'SSR distance', 0.5, 20, 0.5),
        when: screenSpaceReflections,
      },
      {
        ...range('screenSpaceReflectionThickness', 'SSR thickness', 0.05, 1, 0.05),
        when: screenSpaceReflections,
      },
    ],
  },
  {
    title: 'Ambient occlusion',
    toggle: 'ambientOcclusion',
    controls: [
      select('ambientOcclusionResolutionScale', 'Resolution', scales([0.5, 0.75, 1, 1.5, 2])),
      range('ambientOcclusionSamples', 'Samples', 4, 64, 4),
      range('ambientOcclusionRadius', 'Radius', 0.02, 1, 0.02),
      range('ambientOcclusionThickness', 'Thickness', 0.1, 3, 0.1),
      range('ambientOcclusionScale', 'Strength', 0, 2, 0.05),
      toggle('ambientOcclusionTemporalFiltering', 'Temporal filtering'),
    ],
  },
  {
    title: 'Screen-space indirect light',
    toggle: 'screenSpaceIndirectLight',
    controls: [
      range('screenSpaceIndirectLightIntensity', 'Intensity', 0, 16, 0.5),
      range('screenSpaceIndirectLightRadius', 'Radius', 1, 32, 1),
      range('screenSpaceIndirectLightSlices', 'Slices', 1, 4, 1),
      range('screenSpaceIndirectLightSteps', 'Steps', 4, 32, 4),
      range('screenSpaceIndirectLightThickness', 'Thickness', 0.1, 4, 0.1),
      range('screenSpaceIndirectLightExpFactor', 'Exp factor', 1, 4, 0.1),
      range('screenSpaceIndirectLightBackfaceLighting', 'Backface lighting', 0, 1, 0.05),
      range('screenSpaceIndirectLightAmbientOcclusion', 'AO intensity', 0, 4, 0.1),
      toggle('screenSpaceIndirectLightTemporalFiltering', 'Temporal filtering'),
    ],
  },
  {
    title: 'Voxel indirect light',
    toggle: 'voxelIndirectLight',
    controls: [
      select('voxelIndirectLightResolution', 'Voxels', [[64, '64³'], [128, '128³'], [256, '256³']]),
      range('voxelIndirectLightIntensity', 'Intensity', 0, 0.5, 0.01),
      range('voxelIndirectLightBounces', 'Bounces', 0, 4, 1),
      range('voxelIndirectLightConeCount', 'Cones', 1, 9, 1),
      range('voxelIndirectLightConeAngle', 'Cone angle', 10, 80, 5),
    ],
  },
  {
    title: 'Volumetric sunlight',
    toggle: 'volumetricLight',
    controls: [
      select('volumetricLightResolutionScale', 'Resolution', scales([0.25, 0.5, 1])),
      range('volumetricLightDensity', 'Density', 0, 20, 0.5),
      range('volumetricLightMaxDensity', 'Max density', 0, 1, 0.05),
      range('volumetricLightSteps', 'Steps', 16, 256, 16),
      range('volumetricLightDistanceAttenuation', 'Attenuation', 0, 8, 0.25),
      select('volumetricLightBlur', 'Blur', [[0, 'None'], [1, '1'], [2, '2'], [3, '3'], [4, '4'], [6, '6'], [8, '8']]),
    ],
  },
  {
    title: 'Contact shadows',
    toggle: 'contactShadows',
    controls: [
      select('contactShadowResolutionScale', 'Resolution', scales([0.5, 0.75, 1])),
      range('contactShadowDistance', 'Distance', 0.01, 0.5, 0.01),
      range('contactShadowThickness', 'Thickness', 0.005, 0.1, 0.005),
      range('contactShadowIntensity', 'Intensity', 0, 1, 0.05),
      range('contactShadowQuality', 'Quality', 0.1, 2, 0.1),
      toggle('contactShadowDenoise', 'Denoise'),
      {
        ...range('contactShadowDenoiseRadius', 'Denoise radius', 1, 16, 1),
        when: settings => settings.contactShadowDenoise,
      },
    ],
  },
  {
    title: 'Bloom',
    toggle: 'bloom',
    controls: [
      range('bloomStrength', 'Strength', 0, 2, 0.1),
      range('bloomRadius', 'Radius', 0, 1, 0.05),
      range('bloomThreshold', 'Threshold', 0, 4, 0.1),
      range('bloomSmoothWidth', 'Smooth width', 0, 0.5, 0.01),
      range('bloomLuminanceCap', 'Brightness cap', 1, 64, 1),
    ],
  },
  {
    title: 'Finish',
    controls: [
      range('vignette', 'Vignette', 0, 1, 0.05),
      toggle('dither', 'Dither'),
    ],
  },
]
/** the values the panel opened with, which a label turns yellow once it leaves */
const initial = getDefaultCustomGraphics()
const set = (values: Partial<RenderPipelineSettings>) => {
  changeTunedGraphics(() => useCustomGraphics.setState(values))
}
const reset = (keys: Array<RenderPipelineSetting>) => {
  set(Object.fromEntries(keys.map(key => [key, initial[key]])))
}
/** Keeps the second click of a double-click from reaching the label’s control, so double-clicking a checkbox’s label resets it instead of switching it twice. */
const ignoreRepeatedClick = (event: React.MouseEvent) => {
  if (event.detail > 1) {
    event.preventDefault()
  }
}
/** The panel G shows with `?development`, a column left of the canvas: checkboxes switch passes, which rebuilds the pipeline, and sliders change its uniforms live. */
export default function GraphicsTuning() {
  const isHeavy = useGraphicsMode()
  useEffect(() => {
    // Holding Space over the panel shows the frame from before the latest tweak; it is caught before the focused control or the game sees it.
    const show = (event: KeyboardEvent) => {
      if (event.code === 'Space' && useGraphicsTuning.getState().hovered) {
        event.preventDefault()
        event.stopPropagation()
        useTuningBuffer.setState({showing: true})
      }
    }
    const hide = (event: KeyboardEvent) => {
      if (event.code === 'Space' && useTuningBuffer.getState().showing) {
        event.preventDefault()
        event.stopPropagation()
        useTuningBuffer.setState({showing: false})
      }
    }
    const release = () => useTuningBuffer.setState({showing: false})
    addEventListener('keydown', show, {capture: true})
    addEventListener('keyup', hide, {capture: true})
    addEventListener('blur', release)
    return () => {
      removeEventListener('keydown', show, {capture: true})
      removeEventListener('keyup', hide, {capture: true})
      removeEventListener('blur', release)
      // G hid the panel.
      discardTuningBuffer()
    }
  }, [])
  return <aside
    className={css.container} aria-label='Render pipeline' onPointerEnter={() => useGraphicsTuning.setState({hovered: true})} onPointerLeave={() => {
      useGraphicsTuning.setState({hovered: false})
      useTuningBuffer.setState({showing: false})
    }}
  >
    <div className={css.heading}><h2>Render pipeline</h2><button type='button' onClick={() => changeTunedGraphics(() => useCustomGraphics.setState(initial, true))}>Reset</button></div>
    <p className={css.hint}>{isHeavy ? 'Pause to tune. The menu hides while the pointer is over the panel. Double-click a label to reset it. Hold Space to see the frame from before the latest change.' : 'Switch graphics on in the menu to tune the pipeline.'}</p>
    <Branch if={isHeavy}>{sections.map(section => <SectionBox key={section.title} section={section} />)}</Branch>
  </aside>
}
function ControlRow({control, disabled}: {
  control: Control
  disabled: boolean
}) {
  const value = useCustomGraphics(state => state[control.key])
  const applies = useCustomGraphics(state => control.when?.(state) ?? true)
  const id = `tuning-${control.key}`
  const label = <span data-changed={value !== initial[control.key] || undefined} onClick={ignoreRepeatedClick} onDoubleClick={() => reset([control.key])}>{control.label}</span>
  if (control.kind === 'toggle') {
    return <label className={css.toggle}>{label}<input id={id} checked={value as boolean} disabled={disabled || !applies} type='checkbox' onChange={event => set({[control.key]: event.currentTarget.checked})} /></label>
  }
  if (control.kind === 'select') {
    const index = control.options.findIndex(([option]) => option === value)
    return <label className={css.row}>{label}<select id={id} disabled={disabled || !applies} value={index} onChange={event => set({[control.key]: control.options[Number(event.currentTarget.value)][0]})}>{control.options.map(([, optionLabel], optionIndex) => <option key={optionLabel} value={optionIndex}>{optionLabel}</option>)}</select></label>
  }
  return <label className={css.row}>
    {label}
    <input id={id} disabled={disabled || !applies} max={control.max} min={control.min} step={control.step} type='range' value={value as number} onChange={event => set({[control.key]: Number(event.currentTarget.value)})} />
    <output htmlFor={id}>{Number((value as number).toFixed(3))}</output>
  </label>
}
function SectionBox({section}: {section: Section}) {
  const enabled = useCustomGraphics(state => section.toggle === undefined || state[section.toggle])
  const keys = [...section.toggle === undefined ? [] : [section.toggle], ...section.controls.map(control => control.key)]
  const changed = useCustomGraphics(state => keys.some(key => state[key] !== initial[key]))
  return <fieldset className={css.section}>
    <legend data-changed={changed || undefined} onClick={ignoreRepeatedClick} onDoubleClick={() => reset(keys)}><Branch if={section.toggle} else={section.title}><label><input checked={enabled} type='checkbox' onChange={event => set({[section.toggle!]: event.currentTarget.checked})} /> {section.title}</label></Branch></legend>
    {section.controls.map(control => <ControlRow key={control.key} control={control} disabled={!enabled} />)}
  </fieldset>
}
