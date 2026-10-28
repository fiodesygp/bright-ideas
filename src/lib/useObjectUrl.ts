import { useEffect, useState } from 'react'

/** A temporary URL for showing a stored Blob in an <img>, revoked on cleanup. */
export function useObjectUrl(blob: Blob | null | undefined) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    // The URL is an external resource that must be revoked, so it is created in an effect.
    const u = blob ? URL.createObjectURL(blob) : undefined
    // oxlint-disable-next-line react/set-state-in-effect
    setUrl(u)
    return () => {
      if (u) URL.revokeObjectURL(u)
    }
  }, [blob])
  return url
}
