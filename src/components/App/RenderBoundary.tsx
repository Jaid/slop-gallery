import type {PropsWithChildren} from 'react'

import {Component} from 'react'

export default class RenderBoundary extends Component<PropsWithChildren, {failed: boolean}> {
  static getDerivedStateFromError() {
    return {failed: true}
  }
  state = {failed: false}
  render() {
    if (this.state.failed) {
      return <div className="render-error"><span className="eyebrow">THE LIGHTS WENT OUT</span><h2>The gallery needs a fresh start.</h2><p>Use an up-to-date Chromium browser with WebGPU and hardware acceleration enabled. Your saved collection is still on this device.</p><button className="primary-button" onClick={() => location.reload()}>Reopen the gallery</button></div>
    }
    return this.props.children
  }
}
