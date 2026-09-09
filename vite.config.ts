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
    server: {host: '127.0.0.1'},
  }
})
