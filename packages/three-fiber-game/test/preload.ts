// Match Vite’s ESM preference and the host’s shared WebGPU Fiber alias.
// Rapier’s CommonJS main cannot require Three’s async WebGPU module in Bun.
const fiber = Bun.resolveSync('@react-three/fiber/webgpu', import.meta.dir)
const rapier = Bun.resolveSync('@react-three/rapier/dist/react-three-rapier.esm.js', import.meta.dir)
export const webgpuResolution: Bun.BunPlugin = {
  name: 'webgpu-game-test-resolution',
  setup(build) {
    build.onResolve({filter: /^@react-three\/fiber$/u}, () => ({path: fiber}))
    build.onResolve({filter: /^@react-three\/rapier$/u}, () => ({path: rapier}))
  },
}

await Bun.plugin(webgpuResolution)
