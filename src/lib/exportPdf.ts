// Loaded on demand. Builds a tagged, text-based PDF (PDF/UA) of the dashboard:
// real headings, paragraphs, and lists that can be selected and read aloud,
// with alt text on the chart and photos.
import PDFDocument from 'pdfkit'
import { toBlob } from 'pdfkit/output'
import regularUrl from '@fontsource/encode-sans/files/encode-sans-latin-400-normal.woff?url'
import boldUrl from '@fontsource/encode-sans/files/encode-sans-latin-700-normal.woff?url'
import { fromCm, type HeightUnit, type LogEntry } from '../data/db'
import { formatDate, parseISODate, todayISO } from './dates'
import { download } from './exportImage'
import { fmtNum, heightText } from './labels'
import { chartSummary, chronological, photoAlt, summaryStats } from './stats'

interface Input {
  entries: LogEntry[]
  plantName: string
  unit: HeightUnit
}

const M = 50
const INK = '#111111'
const INK_2 = '#4a524d'
const GREEN = '#2e7d3e'
const LIME = '#b2d35b'
const GRID = '#e2e8e1'

export async function exportPdf({ entries, plantName, unit }: Input, filename: string) {
  const [regular, bold] = await Promise.all([regularUrl, boldUrl].map((u) => fetch(u).then((r) => r.arrayBuffer())))
  const title = `Planting Log: ${plantName}`

  const doc = new PDFDocument({
    size: 'A4',
    margin: M,
    pdfVersion: '1.7',
    tagged: true,
    lang: 'en-US',
    displayTitle: true,
    // PDF/UA is supported by pdfkit but missing from its type definitions.
    subset: 'PDF/UA' as PDFKit.Mixins.PDFSubsets,
    info: { Title: title, Author: 'Bright Ideas', Subject: 'Plant growth log' },
    // The browser build has no standard fonts, and PDF/UA needs embedded fonts anyway.
    font: regular as unknown as string,
  })
  const blob = toBlob(doc)
  doc.registerFont('Body', regular)
  doc.registerFont('Bold', bold)

  const W = doc.page.width - M * 2
  const bottom = () => doc.page.height - M
  const root = doc.struct('Document')
  doc.addStructure(root)

  const ensureSpace = (h: number) => {
    if (doc.y + h > bottom()) doc.addPage()
  }
  const heading = (tag: 'H1' | 'H2' | 'H3', text: string, size: number, color = INK) => {
    ensureSpace(size * 2.5)
    root.add(doc.struct(tag, {}, () => doc.font('Bold').fontSize(size).fillColor(color).text(text, M, doc.y, { width: W })))
    doc.moveDown(0.3)
  }
  const para = (text: string, size = 11, color = INK) => {
    doc.font('Body').fontSize(size)
    ensureSpace(doc.heightOfString(text, { width: W }) + 4)
    root.add(doc.struct('P', {}, () => doc.fillColor(color).text(text, M, doc.y, { width: W })))
    doc.moveDown(0.4)
  }

  // Decorative lime band, marked as an artifact so screen readers skip it.
  doc.markContent('Artifact', { type: 'Layout' })
  doc.rect(0, 0, doc.page.width, 8).fill(LIME)
  doc.endMarkedContent()
  doc.y = M

  heading('H1', title, 24, GREEN)
  para(`Made with Bright Ideas on ${formatDate(todayISO())}.`, 11, INK_2)

  if (entries.length === 0) {
    para('No entries yet.')
  } else {
    // Summary as a real list.
    heading('H2', 'Summary', 15)
    const stats = summaryStats(entries, unit)
    ensureSpace(stats.length * 18)
    root.add(
      doc.struct(
        'L',
        {},
        stats.map((s) =>
          doc.struct('LI', {}, [
            doc.struct('LBody', {}, () =>
              doc.font('Body').fontSize(11).fillColor(INK).text(`${s.label}${s.note ? ` (${s.note})` : ''}: `, M + 10, doc.y, { continued: true, width: W - 10 }).font('Bold').text(s.value),
            ),
          ]),
        ),
      ),
    )
    doc.moveDown(0.6)

    // Chart drawn as vector graphics, tagged as one figure with a text description.
    heading('H2', `Height over time (${unit})`, 15)
    const chartH = 190
    ensureSpace(chartH + 10)
    const top = doc.y
    root.add(doc.struct('Figure', { alt: `Line chart. ${chartSummary(entries, unit)}` }, () => drawChart(doc, entries, unit, M, top, W, chartH)))
    doc.y = top + chartH + 14

    heading('H2', 'Entries (newest first)', 15)
    for (const e of entries) await drawEntry(e)
  }

  async function drawEntry(e: LogEntry) {
    const photo = e.photo ? await e.photo.arrayBuffer() : null
    const photoW = 120
    const photoH = 90
    const textX = photo ? M + photoW + 14 : M
    const textW = W - (textX - M)
    doc.font('Body').fontSize(11)
    const noteH = e.note ? doc.heightOfString(e.note, { width: textW }) : 0
    ensureSpace(Math.max(photo ? photoH : 0, 22 + noteH) + 22)

    const y0 = doc.y
    doc.markContent('Artifact', { type: 'Layout' })
    doc.moveTo(M, y0).lineTo(M + W, y0).lineWidth(0.75).strokeColor(GRID).stroke()
    doc.endMarkedContent()
    const y = y0 + 10

    const label = `${formatDate(e.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} - ${heightText(e, unit)}`
    root.add(doc.struct('H3', {}, () => doc.font('Bold').fontSize(12.5).fillColor(INK).text(label, textX, y, { width: textW })))
    if (e.note) {
      root.add(doc.struct('P', {}, () => doc.font('Body').fontSize(11).fillColor(INK).text(e.note, textX, doc.y + 2, { width: textW })))
    }
    const textBottom = doc.y
    if (photo) {
      root.add(doc.struct('Figure', { alt: photoAlt(e, unit, plantName) }, () => doc.image(photo, M, y, { fit: [photoW, photoH] })))
    }
    doc.y = Math.max(textBottom, photo ? y + photoH : 0) + 12
  }

  root.end()
  doc.end()
  const url = URL.createObjectURL(await blob)
  download(url, filename)
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

function drawChart(doc: PDFKit.PDFDocument, entries: LogEntry[], unit: HeightUnit, x0: number, y0: number, w: number, h: number) {
  const pad = { top: 10, right: 12, bottom: 22, left: 36 }
  const pts = chronological(entries).map((e) => ({ date: e.date, t: parseISODate(e.date).getTime(), v: fromCm(e.heightCm, unit) }))
  const t0 = pts[0].t
  const t1 = pts[pts.length - 1].t
  const maxV = Math.max(...pts.map((p) => p.v))
  const step = Math.pow(10, Math.floor(Math.log10(maxV || 1)))
  const yMax = [1, 2, 2.5, 5, 10].map((m) => m * step).find((v) => v >= maxV) ?? 10 * step
  const iw = w - pad.left - pad.right
  const ih = h - pad.top - pad.bottom
  const x = (t: number) => x0 + pad.left + (t1 === t0 ? iw / 2 : ((t - t0) / (t1 - t0)) * iw)
  const y = (v: number) => y0 + pad.top + ih - (v / (yMax || 1)) * ih

  doc.font('Body').fontSize(8.5)
  for (const f of [0, 0.25, 0.5, 0.75, 1]) {
    const v = f * yMax
    doc.moveTo(x0 + pad.left, y(v)).lineTo(x0 + w - pad.right, y(v)).lineWidth(0.6).strokeColor(f === 0 ? '#6f7a74' : GRID).stroke()
    doc.fillColor(INK_2).text(fmtNum(v), x0, y(v) - 4, { width: pad.left - 6, align: 'right' })
  }
  if (pts.length > 1) {
    doc.moveTo(x(t0), y(0))
    pts.forEach((p) => doc.lineTo(x(p.t), y(p.v)))
    doc.lineTo(x(t1), y(0)).closePath().fillOpacity(0.3).fill(LIME).fillOpacity(1)
    doc.moveTo(x(pts[0].t), y(pts[0].v))
    pts.slice(1).forEach((p) => doc.lineTo(x(p.t), y(p.v)))
    doc.lineWidth(2).strokeColor(GREEN).stroke()
  }
  pts.forEach((p) => doc.circle(x(p.t), y(p.v), 3.5).fill(GREEN))
  const labels = pts.length === 1 ? [pts[0]] : [pts[0], pts[pts.length - 1]]
  labels.forEach((p, i) => {
    const text = formatDate(p.date, { month: 'short', day: 'numeric' })
    const tw = doc.widthOfString(text)
    const lx = pts.length === 1 ? x(p.t) - tw / 2 : i === 0 ? x(p.t) : x(p.t) - tw
    doc.fillColor(INK_2).text(text, lx, y0 + h - 14, { lineBreak: false })
  })
}
