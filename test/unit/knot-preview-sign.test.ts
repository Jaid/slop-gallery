import type {ReactElement} from 'react'

type Element = ReactElement<{children?: Element | Array<Element>
  color?: string
  map?: {image: {height: number
    width: number}}
  text?: string}>

import {expect, test} from 'bun:test'
import {resolve} from 'node:path'

import {knotPreviewGrid, knotPreviewMaximumHeight, knotPreviewMaximumWidth, knotPreviewTile} from '../../src/lib/knots/KnotPreviewLayout.ts'

test('runtime billboard layout preserves the previous physical bounds without a combined texture', () => {
  for (const count of [1, 4, 5, 17, 22]) {
    const grid = knotPreviewGrid(count)
    expect(grid.width).toBeLessThanOrEqual(knotPreviewMaximumWidth)
    expect(grid.height).toBeLessThanOrEqual(knotPreviewMaximumHeight)
    expect(grid.rows).toBe(Math.max(2, Math.ceil(count / 4)))
    for (let index = 0; index < count; index++) {
      const tile = knotPreviewTile(count, index)
      expect(Math.abs(tile.x)).toBeLessThan(grid.width / 2)
      expect(Math.abs(tile.y)).toBeLessThan(grid.height / 2)
    }
  }
})

test('billboard tiles use each Knot icon and render their runtime number and title dynamically', async () => {
  const entry = resolve(import.meta.dir, '../../src/components/levels/knottingham/KnotPreviewSigns/index.tsx')
  const result = await Bun.build({
    entrypoints: [entry],
    target: 'bun',
    define: {'process.env.NODE_ENV': JSON.stringify('production')},
    plugins: [{
      name: 'runtime-knot-preview-fixture',
      setup(build) {
        build.onResolve({filter: /^#/u}, ({path}) => ({path, namespace: 'fixture'}))
        build.onLoad({filter: /.*/u, namespace: 'fixture'}, ({path}) => {
          if (path.includes('gallery/actions')) {
            return {contents: 'export const narrate = () => {}', loader: 'js'}
          }
          if (path.includes('knots/exhibition')) {
            return {contents: 'export const knotPreviewX = -10; export const knotNumberLabel = n => "#" + String(n).padStart(2, "0")', loader: 'js'}
          }
          if (path.includes('KnotPreviewLayout')) {
            return {contents: 'export const knotPreviewGrid = () => ({width:4.8,height:2.75,tileWidth:1.2,rowHeight:1.375,columns:4,rows:2}); export const knotPreviewTile = () => ({width:4.8,height:2.75,tileWidth:1.2,rowHeight:1.375,columns:4,rows:2,x:0,y:0})', loader: 'js'}
          }
          if (path.includes('useArtworkTexture')) {
            return {contents: 'export default source => ({texture:{uuid:source,image:{width:200,height:100}},failed:false})', loader: 'js'}
          }
          return {contents: 'export default function Stub(props){ return props }', loader: 'js'}
        })
      },
    }],
  })
  expect(result.success).toBe(true)
  const source = await result.outputs[0].text()
  const module = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64')) as {
    KnotPreviewTile: (props: {count: number
      finish: {accent: string
        icon: string
        id: string
        number: number
        title: string}
      index: number}) => ReactElement
  }
  const finish = {
    accent: '#abcdef',
    icon: 'knot-icon.jxl',
    id: 'model/example',
    number: 7,
    title: 'Example Knot',
  }
  const tile = module.KnotPreviewTile({
    count: 1,
    finish,
    index: 0,
  }) as Element
  const children = tile.props.children as Array<Element>
  const icon = children[0]
  const caption = children[1]
  const material = (icon.props.children as Array<Element>)[1]
  expect(material.props.map!.image).toEqual({width: 200, height: 100})
  expect(caption.props.text).toBe('#07 \u00B7 Example Knot')
  expect(caption.props.color).toBe('#abcdef')
})
