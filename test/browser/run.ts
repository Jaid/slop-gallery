import {fileURLToPath} from 'node:url'

import puppeteer, {TargetType} from 'puppeteer-core'

const origin = 'https://vite.tower.lan'
// Resolve the running Vite optimizer generation without loading the fixture through Vite HMR.
const response = await fetch('http://localhost:5173/packages/canvas-textures/src/three/textureFromImage.ts')
const transformed = await response.text()
const version = /three_webgpu\.js\?v=([^"']+)/u.exec(transformed)?.[1]
if (!version) {
  throw new Error('Could not resolve the running Vite dependency generation.')
}
const paths: Record<string, string> = {
  '@react-three/fiber/webgpu': '/node_modules/.vite/deps/@react-three_fiber_webgpu.js',
  react: '/node_modules/.vite/deps/react.js',
  'react/jsx-dev-runtime': '/node_modules/.vite/deps/react_jsx-dev-runtime.js',
  'react/jsx-runtime': '/node_modules/.vite/deps/react_jsx-runtime.js',
  'react-dom/client': '/node_modules/.vite/deps/react-dom_client.js',
  'three-mesh-bvh': '/node_modules/.vite/deps/three-mesh-bvh.js',
  'three/tsl': '/node_modules/.vite/deps/three_tsl.js',
  'three/webgpu': '/node_modules/.vite/deps/three_webgpu.js',
  'disposable-lifetime/react': '/packages/disposable-lifetime/src/react/main.ts',
  'canvas-textures/three': '/packages/canvas-textures/src/three/main.ts',
}
const build = await Bun.build({
  entrypoints: [fileURLToPath(new URL(process.argv[2] ?? 'canvasTextures.tsx', import.meta.url))],
  target: 'browser',
  plugins: [
    {
      name: 'live-vite-imports',
      setup(builder) {
        builder.onResolve({filter: /^(?:@react-three|canvas-textures|disposable-lifetime|react|three)/u}, ({path}) => {
          const source = paths[path]
          if (!source) {
            throw new Error(`Unexpected browser fixture import: ${path}`)
          }
          if (path === 'react' || path.startsWith('react/')) {
            return {
              path,
              namespace: 'vite-commonjs',
            }
          }
          if (path === 'react-dom/client') {
            return {
              path,
              namespace: 'vite-commonjs',
            }
          }
          return {
            path: origin + source + (source.includes('/deps/') ? `?v=${version}` : ''),
            external: true,
          }
        })
        builder.onLoad({
          filter: /.*/u,
          namespace: 'vite-commonjs',
        }, ({path}) => {
          const exports: Record<string, Array<string>> = {
            react: ['StrictMode', 'useEffect', 'useMemo'],
            'react-dom/client': ['createRoot'],
            'react/jsx-dev-runtime': ['jsxDEV', 'Fragment'],
            'react/jsx-runtime': ['jsx', 'jsxs', 'Fragment'],
          }
          return {
            loader: 'js',
            contents: `import value from ${JSON.stringify(`${origin + paths[path]}?v=${version}`)}; export const {${exports[path].join(',')}} = value;`,
          }
        })
      },
    },
  ],
})
if (!build.success) {
  throw new AggregateError(build.logs, 'Browser fixture build failed.')
}
const source = `data:text/javascript;base64,${Buffer.from(await build.outputs[0].text()).toString('base64')}`
const browser = await puppeteer.connect({
  browserURL: 'http://localhost:9223',
  defaultViewport: null,
  protocolTimeout: 180_000,
})
try {
  const target = await browser.waitForTarget(candidate => candidate.type() === TargetType.PAGE && candidate.url().startsWith(origin), {timeout: 180_000})
  const page = await target.page()
  if (!page) {
    throw new Error('The existing game page is unavailable.')
  }
  const result = await page.evaluate(async fixtureUrl => {
    const {default: verify} = await import(fixtureUrl) as {default: () => Promise<unknown>}
    return verify()
  }, source)
  console.log(JSON.stringify(result, null, 2))
} finally {
  await browser.disconnect()
}
