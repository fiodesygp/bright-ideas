// Loaded on demand so html-to-image stays out of the main bundle.
import { toCanvas } from 'html-to-image'

export function download(href: string, filename: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export async function exportImage(node: HTMLElement, filename: string) {
  await Promise.all([...node.querySelectorAll('img')].map((img) => img.decode().catch(() => undefined)))
  const canvas = await toCanvas(node, { pixelRatio: 2, backgroundColor: '#ffffff' })
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
  if (!blob) throw new Error('Could not make image')
  const url = URL.createObjectURL(blob)
  download(url, filename)
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
