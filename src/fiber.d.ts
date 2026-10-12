import '@react-three/fiber'

declare module '@react-three/fiber' {
  /** Slop Gallery renders exclusively with WebGPU, which narrows every renderer-typed Fiber field. */
  interface Register {
    renderer: 'webgpu'
  }
}
