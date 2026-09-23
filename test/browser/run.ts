import {fileURLToPath} from 'node:url'

import puppeteer, {TargetType} from 'puppeteer-core'

const standalone = process.argv.includes('--standalone')
const origin = process.env.BROWSER_TEST_ORIGIN ?? (standalone ? 'https://knot.slop.gallery' : 'https://vite.tower.lan')
// Standalone fixtures own all their renderers/resources and can use an existing production
// page without Vite, HMR, navigation or input. Live integration fixtures still share Vite imports.
let version: string | undefined
if (!standalone) {
  const response = await fetch('http://127.0.0.1:5173/packages/canvas-textures/src/three/textureFromImage.ts')
  const transformed = await response.text()
  version = /three_webgpu\.js\?v=([^"']+)/u.exec(transformed)?.[1]
  if (!version) {
    throw new Error('Could not resolve the running Vite dependency generation.')
  }
}
const paths: Record<string, string> = {
  '@react-three/fiber/webgpu': '/node_modules/.vite/deps/@react-three_fiber_webgpu.js',
  react: '/node_modules/.vite/deps/react.js',
  'react/jsx-dev-runtime': '/node_modules/.vite/deps/react_jsx-dev-runtime.js',
  'react/jsx-runtime': '/node_modules/.vite/deps/react_jsx-runtime.js',
  'react-dom/client': '/node_modules/.vite/deps/react-dom_client.js',
  'three/addons/geometries/RoundedBoxGeometry.js': '/node_modules/.vite/deps/three_addons_geometries_RoundedBoxGeometry__js.js',
  'three-mesh-bvh': '/node_modules/.vite/deps/three-mesh-bvh.js',
  'three/tsl': '/node_modules/.vite/deps/three_tsl.js',
  'three/webgpu': '/node_modules/.vite/deps/three_webgpu.js',
  'disposable-lifetime/react': '/packages/disposable-lifetime/src/react/main.ts',
  'canvas-textures/three': '/packages/canvas-textures/src/three/main.ts',
}
const build = await Bun.build({
  entrypoints: [fileURLToPath(new URL(process.argv.slice(2).find(argument => !argument.startsWith('--')) ?? 'canvasTextures.tsx', import.meta.url))],
  target: 'browser',
  plugins: standalone ? [] : [
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
const bytes = new Uint8Array(await build.outputs[0].arrayBuffer())
const source = `data:text/javascript;base64,${bytes.toBase64()}`
const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9222',
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
