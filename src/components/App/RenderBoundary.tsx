import type {PropsWithChildren} from 'react'

import {Component} from 'react'

import {openPanel} from '#src/lib/gallery.ts'

export default class RenderBoundary extends Component<PropsWithChildren<{onFailure?: () => void}>, {failed: boolean}> {
  static getDerivedStateFromError() {
    return {failed: true}
  }
  state = {failed: false}
  componentDidCatch() {
    this.props.onFailure?.()
  }
  render() {
    if (this.state.failed) {
      return <div className="render-error"><span className="eyebrow">THE LIGHTS WENT OUT</span><h2>The gallery needs a fresh start.</h2><p>Use an up-to-date Chromium browser with WebGPU and hardware acceleration enabled. Your saved collection is still on this device.</p><button className="primary-button" onClick={() => location.reload()}>Reopen the gallery</button><button className="text-button" onClick={() => openPanel('collection')}>Browse the collection</button></div>
    }
    return this.props.children
  }
}
