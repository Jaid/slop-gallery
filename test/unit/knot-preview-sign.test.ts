import type {ReactElement} from 'react'

import {expect, test} from 'bun:test'
import {resolve} from 'node:path'

import {knotBays} from '../../src/lib/knots/exhibition.ts'

type Element = ReactElement<{children: Array<Element>
  color?: string
  map?: unknown;}>

test('preview material is replaced when an asynchronous texture arrives or changes', async () => {
  const entry = resolve(import.meta.dir, '../../src/components/levels/knottingham/KnotPreviewSigns/index.tsx')
  const result = await Bun.build({
    entrypoints: [entry],
    target: 'bun',
    define: {'process.env.NODE_ENV': JSON.stringify('production')},
    plugins: [
      {
        name: 'preview-sign-fixture',
        setup(build) {
          build.onLoad({filter: /KnotPreviewSigns[/\\]index\.tsx$/u}, async ({path}) => ({
            contents: `${await Bun.file(path).text()}\nexport {setResult} from "#src/lib/useArtworkTexture.ts"`,
            loader: 'tsx',
          }))
          build.onResolve({filter: /^#/u}, ({path}) => ({
            path,
            namespace: 'fixture',
          }))
          build.onLoad({
            filter: /.*/u,
            namespace: 'fixture',
          }, ({path}) => ({
            contents: path.includes('useArtworkTexture') ? 'let result; export const setResult = value => {result = value}; export default () => result' : path.includes('exhibition') ? 'export const knotPreviewX = -10' : 'export default "canvas-text"',
            loader: 'js',
          }))
        },
      },
    ],
  })
  expect(result.success).toBe(true)
  const source = await result.outputs[0].text()
  const {default: Preview, setResult} = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`) as {
    default: (props: {bay: typeof knotBays[number]}) => Element
    setResult: (value: {failed: boolean
      texture: {image: {height: number
        width: number}
      uuid: string} | null}) => void
  }
  const material = () => Preview({bay: knotBays[0]}).props.children[0].props.children[1]
  setResult({
    texture: null,
    failed: false,
  })
  const loading = material()
  expect(loading.key).toBe('loading')
  expect(loading.props.map).toBeNull()
  for (const uuid of ['first-overview', 'replacement-overview']) {
    const texture = {
      uuid,
      image: {
        width: 1280,
        height: 732,
      },
    }
    setResult({
      texture,
      failed: false,
    })
    const ready = material()
    expect(ready.key).toBe(uuid)
    expect(ready.key).not.toBe(loading.key)
    expect(ready.props.map).toBe(texture)
    expect(ready.props.color).toBe('#ffffff')
  }
  setResult({
    texture: null,
    failed: true,
  })
  expect(material().key).toBe('loading')
  expect(material().props.map).toBeNull()
})
