import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { applyPdfLightTheme } from '@/lib/pdfTheme'
import { applyTiledWatermark, applyDownloadFooter, buildDownloadStamp } from '@/lib/pdfWatermark'

const MODERN_COLOR_PATTERN = /oklch|color-mix|lab\(|lch\(|var\(/i

const COLOR_PROPS = [
  'color',
  'backgroundColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'outlineColor',
  'textDecorationColor',
  'columnRuleColor',
] as const

const LAYOUT_PROPS = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'lineHeight',
  'letterSpacing',
  'textAlign',
  'textTransform',
  'textDecorationLine',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderTopStyle',
  'borderRightStyle',
  'borderBottomStyle',
  'borderLeftStyle',
  'borderRadius',
  'display',
  'flexDirection',
  'alignItems',
  'justifyContent',
  'gap',
  'width',
  'height',
  'minHeight',
  'maxWidth',
  'listStyleType',
  'whiteSpace',
  'overflow',
  'verticalAlign',
] as const

let colorProbeCanvas: HTMLCanvasElement | null = null

function camelToKebab(prop: string) {
  return prop.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
}

function toCanvasColor(color: string): string {
  if (!colorProbeCanvas) {
    colorProbeCanvas = document.createElement('canvas')
    colorProbeCanvas.width = 1
    colorProbeCanvas.height = 1
  }

  const context = colorProbeCanvas.getContext('2d')
  if (!context) return '#000000'

  context.fillStyle = '#ffffff'
  context.fillStyle = color
  return context.fillStyle
}

function resolveColor(value: string, property: string): string {
  if (!value || value === 'transparent' || value === 'rgba(0, 0, 0, 0)') return value
  if (!MODERN_COLOR_PATTERN.test(value)) return value

  const probe = document.createElement('span')
  probe.style.setProperty(property, value, 'important')
  probe.style.position = 'absolute'
  probe.style.visibility = 'hidden'
  probe.style.pointerEvents = 'none'
  document.body.appendChild(probe)

  const resolved = getComputedStyle(probe).getPropertyValue(property)
  probe.remove()

  if (!resolved || MODERN_COLOR_PATTERN.test(resolved)) {
    return toCanvasColor(value)
  }

  return resolved
}

function inlineSafeStyles(original: Element, clone: HTMLElement) {
  const computed = getComputedStyle(original)

  for (const prop of COLOR_PROPS) {
    const value = computed[prop]
    if (!value) continue
    clone.style.setProperty(camelToKebab(prop), resolveColor(value, camelToKebab(prop)), 'important')
  }

  for (const prop of LAYOUT_PROPS) {
    const value = computed[prop]
    if (!value) continue
    clone.style.setProperty(camelToKebab(prop), value, 'important')
  }

  clone.style.setProperty('box-shadow', 'none', 'important')
  clone.style.setProperty('background-image', 'none', 'important')
  clone.removeAttribute('class')

  const originalChildren = original.children
  const cloneChildren = clone.children
  for (let index = 0; index < originalChildren.length; index += 1) {
    const cloneChild = cloneChildren[index]
    if (!cloneChild) continue
    inlineSafeStyles(originalChildren[index]!, cloneChild as HTMLElement)
  }
}

function prepareCloneForCapture(clonedDoc: Document, originalElement: HTMLElement, clonedElement: HTMLElement) {
  clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => node.remove())
  applyPdfLightTheme(clonedElement)
  inlineSafeStyles(originalElement, clonedElement)
  clonedElement.style.backgroundColor = '#ffffff'
}

export interface DownloadPdfOptions {
  element: HTMLElement
  filename: string
  watermark?: {
    userEmail: string
    downloadedAt?: Date
  }
}

export async function downloadElementAsPdf({ element, filename, watermark }: DownloadPdfOptions) {
  const downloadedAt = watermark?.downloadedAt ?? new Date()
  const downloadStamp = watermark
    ? buildDownloadStamp(watermark.userEmail, downloadedAt)
    : null

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    onclone: (clonedDoc, clonedElement) => {
      prepareCloneForCapture(clonedDoc, element, clonedElement as HTMLElement)
    },
  })

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const imgWidth = pageWidth - 20
  const imgHeight = (canvas.height * imgWidth) / canvas.width
  const imgData = canvas.toDataURL('image/png')

  let heightLeft = imgHeight
  let position = 10

  pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
  heightLeft -= pageHeight

  while (heightLeft > 0) {
    position = heightLeft - imgHeight
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
  }

  if (watermark) {
    const totalPages = pdf.internal.pages.length - 1

    for (let page = 1; page <= totalPages; page += 1) {
      pdf.setPage(page)
      applyTiledWatermark(pdf, pageWidth, pageHeight, watermark.userEmail)
      if (downloadStamp) {
        applyDownloadFooter(pdf, pageWidth, pageHeight, downloadStamp)
      }
    }
  }

  pdf.save(filename)
}
