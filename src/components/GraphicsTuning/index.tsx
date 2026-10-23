import type {CustomGraphics, CustomGraphicsKey} from '#src/lib/rendering/customGraphics.ts'

import Branch from 'branch-component'
import useGraphicsMode from 'use-graphics-mode'

import {defaultCustomGraphics, useCustomGraphics} from '#src/lib/rendering/customGraphics.ts'

import css from './style.module.sass'

type BooleanKey = {[Key in CustomGraphicsKey]: CustomGraphics[Key] extends boolean ? Key : never}[CustomGraphicsKey]
type NumberKey = {[Key in CustomGraphicsKey]: CustomGraphics[Key] extends number ? Key : never}[CustomGraphicsKey]
type Control = {
  key: BooleanKey
  kind: 'toggle'
  label: string
} | {
  key: CustomGraphicsKey
  kind: 'select'
  label: string
  options: Array<[value: CustomGraphics[CustomGraphicsKey], label: string]>
} | {
  key: NumberKey
  kind: 'range'
  label: string
  max: number
  min: number
  step: number
}
type Section = {
  controls: Array<Control>
  title: string
  /** the pass this section tunes, which its heading switches on and off */
  toggle?: BooleanKey
}

const scales = (values: Array<number>): Array<[number, string]> => values.map(value => [value, `${value}×`])
const sections: Array<Section> = [
  {
    title: 'Antialiasing',
    controls: [{
      key: 'antiAliasing',
      kind: 'select',
      label: 'Method',
      options: [['traa', 'TRAA'], ['smaa', 'SMAA'], [false, 'Off']],
    }],
  },
  {
    title: 'Ambient occlusion',
    toggle: 'ambientOcclusion',
    controls: [
      {
        key: 'ambientOcclusionResolutionScale',
        kind: 'select',
        label: 'Resolution',
        options: scales([0.5, 0.75, 1, 1.5, 2]),
      },
      {
        key: 'ambientOcclusionSamples',
        kind: 'range',
        label: 'Samples',
        min: 4,
        max: 64,
        step: 1,
      },
      {
        key: 'ambientOcclusionRadius',
        kind: 'range',
        label: 'Radius',
        min: 0.05,
        max: 1,
        step: 0.01,
      },
      {
        key: 'ambientOcclusionThickness',
        kind: 'range',
        label: 'Thickness',
        min: 0.1,
        max: 3,
        step: 0.05,
      },
      {
        key: 'ambientOcclusionScale',
        kind: 'range',
        label: 'Strength',
        min: 0,
        max: 2,
        step: 0.05,
      },
    ],
  },
  {
    title: 'Screen-space indirect light',
    toggle: 'screenSpaceIndirectLight',
    controls: [
      {
        key: 'screenSpaceIndirectLightIntensity',
        kind: 'range',
        label: 'Intensity',
        min: 0,
        max: 16,
        step: 0.1,
      },
      {
        key: 'screenSpaceIndirectLightRadius',
        kind: 'range',
        label: 'Radius',
        min: 1,
        max: 32,
        step: 0.5,
      },
      {
        key: 'screenSpaceIndirectLightSlices',
        kind: 'range',
        label: 'Slices',
        min: 1,
        max: 4,
        step: 1,
      },
      {
        key: 'screenSpaceIndirectLightSteps',
        kind: 'range',
        label: 'Steps',
        min: 4,
        max: 32,
        step: 1,
      },
    ],
  },
  {
    title: 'Voxel indirect light',
    toggle: 'voxelIndirectLight',
    controls: [
      {
        key: 'voxelIndirectLightIntensity',
        kind: 'range',
        label: 'Intensity',
        min: 0,
        max: 0.5,
        step: 0.005,
      },
      {
        key: 'voxelIndirectLightBounces',
        kind: 'range',
        label: 'Bounces',
        min: 0,
        max: 4,
        step: 1,
      },
    ],
  },
  {
    title: 'Volumetric sunlight',
    toggle: 'volumetricLight',
    controls: [
      {
        key: 'volumetricLightDensity',
        kind: 'range',
        label: 'Density',
        min: 0,
        max: 20,
        step: 0.1,
      },
      {
        key: 'volumetricLightMaxDensity',
        kind: 'range',
        label: 'Max density',
        min: 0,
        max: 10,
        step: 0.1,
      },
      {
        key: 'volumetricLightSteps',
        kind: 'range',
        label: 'Steps',
        min: 16,
        max: 240,
        step: 1,
      },
    ],
  },
  {
    title: 'Contact shadows',
    toggle: 'contactShadows',
    controls: [
      {
        key: 'contactShadowDistance',
        kind: 'range',
        label: 'Distance',
        min: 0.01,
        max: 0.5,
        step: 0.005,
      },
      {
        key: 'contactShadowThickness',
        kind: 'range',
        label: 'Thickness',
        min: 0.001,
        max: 0.1,
        step: 0.001,
      },
      {
        key: 'contactShadowIntensity',
        kind: 'range',
        label: 'Intensity',
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        key: 'contactShadowQuality',
        kind: 'range',
        label: 'Quality',
        min: 0.1,
        max: 2,
        step: 0.05,
      },
      {
        key: 'contactShadowDenoise',
        kind: 'toggle',
        label: 'Denoise',
      },
    ],
  },
  {
    title: 'Bloom',
    toggle: 'bloom',
    controls: [
      {
        key: 'bloomStrength',
        kind: 'range',
        label: 'Strength',
        min: 0,
        max: 2,
        step: 0.01,
      },
      {
        key: 'bloomRadius',
        kind: 'range',
        label: 'Radius',
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        key: 'bloomThreshold',
        kind: 'range',
        label: 'Threshold',
        min: 0,
        max: 4,
        step: 0.05,
      },
    ],
  },
  {
    title: 'Finish',
    controls: [
      {
        key: 'vignette',
        kind: 'range',
        label: 'Vignette',
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        key: 'dither',
        kind: 'toggle',
        label: 'Dither',
      },
      {
        key: 'reflectionResolutionScale',
        kind: 'select',
        label: 'Reflections',
        options: scales([0.5, 1, 2]),
      },
    ],
  },
]
const set = (values: Partial<CustomGraphics>) => {
  useCustomGraphics.setState(values)
}
/** The panel of `?graphics=custom`, a column beside the canvas: checkboxes switch passes, which rebuilds the pipeline, and sliders change its uniforms live. */
export default function GraphicsTuning() {
  const isHeavy = useGraphicsMode()
  return <aside className={css.container} aria-label='Render pipeline'>
    <div className={css.heading}><h2>Render pipeline</h2><button type='button' onClick={() => useCustomGraphics.setState(defaultCustomGraphics, true)}>Reset</button></div>
    <p className={css.hint}>{isHeavy ? 'Pause to tune; press O to hide the menu and see the scene in full.' : 'Switch graphics on in the menu to tune the pipeline.'}</p>
    <Branch if={isHeavy}>{sections.map(section => <SectionBox key={section.title} section={section} />)}</Branch>
  </aside>
}
function ControlRow({control, disabled}: {
  control: Control
  disabled: boolean
}) {
  const value = useCustomGraphics(state => state[control.key])
  const id = `tuning-${control.key}`
  if (control.kind === 'toggle') {
    return <label className={css.toggle}><span>{control.label}</span><input id={id} checked={value as boolean} disabled={disabled} type='checkbox' onChange={event => set({[control.key]: event.currentTarget.checked})} /></label>
  }
  if (control.kind === 'select') {
    const index = control.options.findIndex(([option]) => option === value)
    return <label className={css.row}><span>{control.label}</span><select id={id} disabled={disabled} value={index} onChange={event => set({[control.key]: control.options[Number(event.currentTarget.value)][0]})}>{control.options.map(([, label], optionIndex) => <option key={label} value={optionIndex}>{label}</option>)}</select></label>
  }
  return <label className={css.row}>
    <span>{control.label}</span>
    <input id={id} disabled={disabled} max={control.max} min={control.min} step={control.step} type='range' value={value as number} onChange={event => set({[control.key]: Number(event.currentTarget.value)})} />
    <output htmlFor={id}>{Number((value as number).toFixed(3))}</output>
  </label>
}
function SectionBox({section}: {section: Section}) {
  const enabled = useCustomGraphics(state => section.toggle === undefined || state[section.toggle])
  return <fieldset className={css.section}>
    <legend><Branch if={section.toggle} else={section.title}><label><input checked={enabled} type='checkbox' onChange={event => set({[section.toggle!]: event.currentTarget.checked})} /> {section.title}</label></Branch></legend>
    {section.controls.map(control => <ControlRow key={control.key} control={control} disabled={!enabled} />)}
  </fieldset>
}
