import {useEffect, useState} from 'react'

export default function ArtworkThumb({source, title = '', className}: {className?: string
  source: Blob | string
  title?: string}) {
  const [url, setUrl] = useState(typeof source === 'string' ? source : '')
  useEffect(() => {
    if (typeof source === 'string') {
      setUrl(source)
      return
    }
    const url = URL.createObjectURL(source)
    setUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [source])
  return url ? <img className={className} src={url} alt={title} loading="lazy" decoding="async"/> : <span className="image-placeholder"/>
}
