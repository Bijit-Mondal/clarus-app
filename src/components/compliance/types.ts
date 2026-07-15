export type Requirement = {
  id: string
  code: string
  title: string
  description: string
  maturityLevel: string
  category?: string
}

export type LinkItem = {
  id: string
  name: string
  state?: string
  type?: string
  source?: string
  area?: string
  owner?: string
  controlKey?: string
  coverage?: string
  rationale?: string
  statement?: string
  implementationStatus?: string
}

export type LinkSectionId = 'controls' | 'documents' | 'audits' | 'obligations'

export type LinkSectionConfig = {
  id: LinkSectionId
  label: string
  icon: unknown
  searchPlaceholder: string
  columns: string[]
  emptyLabel: string
}
