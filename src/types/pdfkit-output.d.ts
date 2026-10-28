declare module 'pdfkit/output' {
  export function toBlob(doc: PDFKit.PDFDocument): Promise<Blob>
  export function toBytes(doc: PDFKit.PDFDocument): Promise<Uint8Array>
}
