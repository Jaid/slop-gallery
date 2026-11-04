declare module 'voice:*' {
  // undefined unless VOICE_SAMPLES=true included the sample (see vite.config.ts)
  const result: string | undefined
  export default result
}
