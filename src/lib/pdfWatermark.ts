import type jsPDF from 'jspdf'

export const PDF_WATERMARK_ANGLE = -35
export const PDF_WATERMARK_GRID_SIZE = 24
export const PDF_WATERMARK_GRID_COLUMNS = 3

export function formatPdfDownloadTimestamp(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function buildDownloadStamp(email: string, downloadedAt: Date) {
  return `Downloaded by ${email} on ${formatPdfDownloadTimestamp(downloadedAt)}`
}

function escapeXml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function buildPdfWatermarkPattern(email: string) {
  const safeEmail = escapeXml(email)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="170" viewBox="0 0 300 170">
    <text x="28" y="92" fill="rgba(0,0,0,0.035)" font-family="Segoe UI, sans-serif" font-size="12" font-weight="400" transform="rotate(-35 28 92)">${safeEmail}</text>
  </svg>`

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

export function applyTiledWatermark(
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  text: string,
) {
  const columns = PDF_WATERMARK_GRID_COLUMNS
  const rows = Math.ceil(PDF_WATERMARK_GRID_SIZE / columns)
  const stepX = pageWidth / (columns - 1)
  const stepY = pageHeight / (rows - 1)

  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(232, 232, 232)
  pdf.setFontSize(9)

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const x = col * stepX
      const y = row * stepY + stepY * 0.35
      pdf.text(text, x, y, { angle: PDF_WATERMARK_ANGLE })
    }
  }
}

export function applyDownloadFooter(
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  label: string,
) {
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(130, 130, 130)
  pdf.text(label, pageWidth / 2, pageHeight - 8, { align: 'center' })
}
