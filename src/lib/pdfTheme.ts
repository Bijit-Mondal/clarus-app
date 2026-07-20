/** Fixed light-theme tokens for PDF preview and export (html2canvas-safe RGB/hex). */
export const pdfLightThemeStyle: Record<string, string> = {
  colorScheme: 'light',
  '--background': '#f6f6f6',
  '--foreground': '#282828',
  '--card': '#ffffff',
  '--card-foreground': '#282828',
  '--muted': '#fafafa',
  '--muted-foreground': '#757575',
  '--primary': '#1f9d78',
  '--primary-foreground': '#ffffff',
  '--secondary': '#ededed',
  '--secondary-foreground': '#3d3d3d',
  '--border': '#dbdbdb',
  '--editor-border': '#e0e0e0',
  '--pdf-desk': '#e8e8e8',
}

export function applyPdfLightTheme(element: HTMLElement) {
  for (const [property, value] of Object.entries(pdfLightThemeStyle)) {
    element.style.setProperty(property, value)
  }
}
