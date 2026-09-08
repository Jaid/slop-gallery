import type {PropsWithChildren} from 'react'
import type {DropEvent} from 'react-dropzone'

import {useEffect} from 'react'
import {useDropzone} from 'react-dropzone'

import {dragPose, galleryEvents, importRejected, useGallery} from '#src/lib/gallery.ts'

import css from './style.module.sass'

export default function Dropzone({children}: PropsWithChildren) {
  const placement = useGallery(s => s.placement)
  const handleDrop = (files: Array<File>, event: DropEvent) => {
    if (event.type === 'drop') {
      const {clientX: x, clientY: y} = event as DragEvent
      galleryEvents.dispatchEvent(new CustomEvent('drop-files', {detail: {files, x, y}}))
    } else {
      void useGallery.getState().importFiles?.(files)
    }
  }
  const {getRootProps, getInputProps, isDragActive, isDragReject} = useDropzone({
    noClick: true,
    noKeyboard: true,
    onDropAccepted: handleDrop,
    onDropRejected: importRejected,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp'],
      'image/avif': ['.avif'],
      'image/gif': ['.gif'],
    },
    maxSize: 25e6,
    onDragOver: event => {
      dragPose.x = event.clientX
      dragPose.y = event.clientY
    },
  })
  useEffect(() => {
    dragPose.active = isDragActive
    useGallery.setState({dragging: isDragActive})
    if (!isDragActive) {
      useGallery.setState({placement: null})
    }
    return () => {
      dragPose.active = false
    }
  }, [isDragActive])
  return <div {...getRootProps({className: css.container})}>
    <input {...getInputProps()} data-artwork-input aria-label="Import artworks"/>
    {children}
    {isDragActive && <div className={`drop-overlay ${isDragReject ? 'rejected' : ''}`}>
      <div className="drop-card"><span className="eyebrow">A NEW ARRIVAL</span><h2>{isDragReject ? 'Not quite a canvas.' : placement?.valid ? 'It would look lovely here.' : 'Make an entrance.'}</h2>
        <p>{isDragReject ? 'Choose a supported image under 25 mb.' : placement?.valid ? 'Drop to hang. The final size is checked before placement.' : 'Aim at an empty wall, or drop to place it in front of you.'}</p>
        <small>PNG · JPEG · WEBP · AVIF · GIF / UP TO 12 AT ONCE</small></div>
    </div>}
  </div>
}
