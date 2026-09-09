import react from '@vitejs/plugin-react'
import {victoriaTelemetry} from 'slop-gallery-telemethree/vite'
import {defineConfig, loadEnv} from 'vite'

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), 'SLOP_VICTORIA_')
  return {
    plugins: [
      react(), victoriaTelemetry({
        metrics: env.SLOP_VICTORIA_METRICS_URL,
        logs: env.SLOP_VICTORIA_LOGS_URL,
        traces: env.SLOP_VICTORIA_TRACES_URL,
      }),
    ],
    build: {
      target: 'chrome152',
      outDir: 'dist',
      sourcemap: true,
      chunkSizeWarningLimit: 6000,
    },
    resolve: {
      // Rapier and other dependencies must use the same WebGPU-only Fiber implementation as the app.
      alias: [
        {
          find: /^@react-three\/fiber$/u,
          replacement: '@react-three/fiber/webgpu',
        },
      ],
    },
    server: {host: '127.0.0.1'},
  }
})
