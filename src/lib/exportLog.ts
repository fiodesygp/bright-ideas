// Loaded on demand so html-to-image and jsPDF stay out of the main bundle.
import { toCanvas } from 'html-to-image'
import { jsPDF } from 'jspdf'

async function capture(node: HTMLElement) {
  await Promise.all([...node.querySelectorAll('img')].map((img) => img.decode().catch(() => undefined)))
  return toCanvas(node, { pixelRatio: 2, backgroundColor: '#ffffff' })
}

function download(href: string, filename: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export async function exportImage(node: HTMLElement, filename: string) {
  const canvas = await capture(node)
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
  if (!blob) throw new Error('Could not make image')
  const url = URL.createObjectURL(blob)
  download(url, filename)
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export async function exportPdf(node: HTMLElement, filename: string) {
  // Measure block edges before capture, in CSS pixels from the top of the sheet.
  const top = node.getBoundingClientRect().top
  const blockEnds = [...node.querySelectorAll<HTMLElement>('[data-block]')].map((b) => b.getBoundingClientRect().bottom - top)
  const totalH = node.offsetHeight
  const canvas = await capture(node)
  const ratio = canvas.width / node.offsetWidth

  const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
  const margin = 36
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const scale = (pageW - margin * 2) / node.offsetWidth
  const sliceMax = (pageH - margin * 2) / scale

  let start = 0
  let first = true
  while (start < totalH - 1) {
    // Break after the last whole block that fits; fall back to a hard cut for very tall blocks.
    const fits = blockEnds.filter((end) => end > start + 1 && end <= start + sliceMax)
    const end = fits.length ? Math.max(...fits) : Math.min(totalH, start + sliceMax)

    const slice = document.createElement('canvas')
    slice.width = canvas.width
    slice.height = Math.ceil((end - start) * ratio)
    slice.getContext('2d')!.drawImage(canvas, 0, -start * ratio)

    if (!first) pdf.addPage()
    pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, pageW - margin * 2, (end - start) * scale)
    first = false
    start = end
  }
  pdf.save(filename)
}
