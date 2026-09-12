import type {PropsWithChildren} from 'react'
import type {DropEvent} from 'react-dropzone'

import Branch from 'branch-component'
import {useEffect} from 'react'
import {useDropzone} from 'react-dropzone'

import ArtworkDropOverlay from '#component/ArtworkDropOverlay'
import {dragPose, galleryEvents, importRejected, notify, useGallery} from '#src/lib/gallery.ts'
import {imageExtensions, maximumImageBytes} from '#src/lib/gallery/imagePolicy.ts'

import css from './style.module.sass'

export default function Dropzone({children}: PropsWithChildren) {
  const placement = useGallery(s => s.placement)
  const handleDrop = (files: Array<File>, event: DropEvent) => {
    if (event.type === 'drop') {
      const {clientX: x, clientY: y} = event as DragEvent
      galleryEvents.dispatchEvent(new CustomEvent('drop-files', {
        detail: {
          files,
          x,
          y,
        },
      }))
    } else {
      const importFiles = useGallery.getState().importFiles
      if (importFiles) {
        void importFiles(files).catch(() => notify('The images could not be imported.'))
      }
    }
  }
  const {getRootProps, getInputProps, isDragActive, isDragReject} = useDropzone({
    noClick: true,
    noKeyboard: true,
    onDropAccepted: handleDrop,
    onDropRejected: importRejected,
    accept: imageExtensions,
    maxSize: maximumImageBytes,
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
    <Branch if={isDragActive}><ArtworkDropOverlay rejected={isDragReject} valid={Boolean(placement?.valid)}/></Branch>
  </div>
}
