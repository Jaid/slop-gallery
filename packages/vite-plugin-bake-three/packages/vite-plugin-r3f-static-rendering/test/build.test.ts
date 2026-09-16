import type {CompiledScene} from '../src/runtime.ts'
import type {ReactElement} from 'react'

import {expect, test} from 'bun:test'
import {mkdtemp, rm, writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'

import {build} from 'vite'

import r3fStaticRendering from '../src/main.ts'
import {StaticSceneResources} from '../src/runtime.ts'

const code = 'export function Scene() { return <group>{[0,1,2,3].map(x => <mesh key={x} position={[x*3,0,0]}><boxGeometry args={[1,1,1]}/><meshStandardNodeMaterial color=\'#fff\'/></mesh>)}</group> }'
const external = ['react', 'react/jsx-runtime', 'three/webgpu', '@react-three/fiber/webgpu', 'disposable-lifetime/react']
test('real Vite build links executable plans, uses fresh instances, and keeps build dependencies out of browser code', async () => {
  const directory = await mkdtemp(join(import.meta.dirname, 'vite-build-'))
  try {
    const input = join(directory, 'entry.tsx')
    await writeFile(input, code)
    const result = await build({
      configFile: false,
      root: directory,
      logLevel: 'silent',
      plugins: [r3fStaticRendering()],
      build: {
        write: false,
        target: 'esnext',
        minify: false,
        sourcemap: true,
        rolldownOptions: {
          preserveEntrySignatures: 'strict',
          input,
          external,
        },
      },
    })
    if (Array.isArray(result) || !('output' in result)) {
      throw new Error('Unexpected build result')
    }
    const chunks = result.output.filter(item => item.type === 'chunk')
    expect(chunks).toHaveLength(1)
    const javascript = chunks[0].code
    expect(javascript).not.toContain('node:')
    expect(javascript).not.toContain('@babel')
    expect(javascript).not.toContain('x * 3')
    const report = result.output.find(item => item.type === 'asset' && item.fileName === 'r3f-static-rendering.json')
    if (report?.type !== 'asset') {
      throw new Error('Missing report')
    }
    expect(JSON.parse(String(report.source))).toMatchObject({
      regions: 1,
      retainedPlans: 1,
    })
    const output = join(directory, 'output.mjs')
    await writeFile(output, javascript)
    const module = await import(pathToFileURL(output).href) as {Scene: () => ReactElement<{compiled: CompiledScene}>}
    const element = module.Scene()
    const resources = new StaticSceneResources(element.props.compiled)
    expect(resources.children[0].type).toBe('Mesh')
    expect('isInstancedMesh' in resources.children[0] && resources.children[0].isInstancedMesh).toBe(true)
    resources.dispose()
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    })
  }
})
test.each(['disabled', 'excluded', 'ssr'])('Vite leaves %s modules unoptimized', async mode => {
  const directory = await mkdtemp(join(import.meta.dirname, 'vite-decline-'))
  try {
    const input = join(directory, 'entry.tsx')
    await writeFile(input, code)
    const options = mode === 'disabled' ? {
      staticInstancing: false as const,
      renderBundles: false as const,
    } : mode === 'excluded' ? {exclude: /entry\.tsx$/u} : {}
    const result = await build({
      configFile: false,
      root: directory,
      logLevel: 'silent',
      plugins: [r3fStaticRendering(options)],
      build: {
        ssr: mode === 'ssr' ? input : false,
        write: false,
        target: 'esnext',
        minify: false,
        rolldownOptions: {
          preserveEntrySignatures: 'strict',
          input,
          external,
        },
      },
    })
    if (Array.isArray(result) || !('output' in result)) {
      throw new Error('Unexpected build result')
    }
    const javascript = result.output.filter(item => item.type === 'chunk').map(item => item.code).join('\n')
    expect(javascript).toContain('.map(')
    expect(javascript).not.toContain('StaticSceneResources')
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    })
  }
})
test('Vite drops plans when their only component is tree-shaken', async () => {
  const directory = await mkdtemp(join(import.meta.dirname, 'vite-shake-'))
  try {
    const input = join(directory, 'entry.tsx')
    await writeFile(join(directory, 'unused.tsx'), code)
    await writeFile(input, 'import {Scene} from \'./unused.tsx\'; export const answer = 42')
    const result = await build({
      configFile: false,
      root: directory,
      logLevel: 'silent',
      plugins: [r3fStaticRendering()],
      build: {
        write: false,
        target: 'esnext',
        minify: false,
        rolldownOptions: {
          preserveEntrySignatures: 'strict',
          input,
          external,
        },
      },
    })
    if (Array.isArray(result) || !('output' in result)) {
      throw new Error('Unexpected build result')
    }
    const report = result.output.find(item => item.type === 'asset' && item.fileName === 'r3f-static-rendering.json')
    if (report?.type !== 'asset') {
      throw new Error('Missing report')
    }
    expect(JSON.parse(String(report.source))).toMatchObject({retainedPlans: 0})
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    })
  }
})
