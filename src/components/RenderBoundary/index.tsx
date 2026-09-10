import type {PropsWithChildren} from 'react'

import {Component} from 'react'

import RenderError from '#component/RenderError'
import {openPanel, useGallery} from '#src/lib/gallery.ts'
import {telemetry} from '#src/lib/telemetry/index.ts'

import css from './style.module.sass'

export default class RenderBoundary extends Component<PropsWithChildren<{onFailure?: () => void}>, {failed: boolean}> {
  static getDerivedStateFromError() {
    return {failed: true}
  }
  state = {failed: false}
  componentDidCatch(error: Error) {
    telemetry?.log('Gallery rendering failed.', 'error', {'error.type': error.name})
    useGallery.setState({
      ready: false,
      locked: false,
      active: null,
      activeLabel: null,
    })
    this.props.onFailure?.()
  }
  render() {
    if (this.state.failed) {
      return <RenderError><span className={css.eyebrow}>THE LIGHTS WENT OUT</span><h2>The gallery needs a fresh start.</h2><p>Use an up-to-date Chromium browser with WebGPU and hardware acceleration enabled. Your saved collection is still on this device.</p><button className={css.primaryButton} onClick={() => location.reload()}>Reopen the gallery</button><button className={css.textButton} onClick={() => openPanel('collection')}>Browse the collection</button></RenderError>
    }
    return this.props.children
  }
}
