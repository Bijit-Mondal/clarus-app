import type { AssessmentStatus } from '@/api/frameworks'

export type { AssessmentStatus }

export const ASSESSMENT_STATUSES: readonly AssessmentStatus[] = [
  'not_started',
  'in_progress',
  'satisfied',
  'partially_satisfied',
  'not_applicable',
  'not_satisfied',
] as const

export const ASSESSMENT_STATUS_LABELS: Record<AssessmentStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  satisfied: 'Satisfied',
  partially_satisfied: 'Partially satisfied',
  not_applicable: 'Not applicable',
  not_satisfied: 'Not satisfied',
}

export function isAssessmentStatus(value: string): value is AssessmentStatus {
  return (ASSESSMENT_STATUSES as readonly string[]).includes(value)
}

export function normalizeAssessmentStatus(value: string | null | undefined): AssessmentStatus {
  if (value && isAssessmentStatus(value)) return value
  return 'not_started'
}

export type Requirement = {
  id: string
  code: string
  title: string
  description: string
  assessmentStatus: AssessmentStatus
  rationale?: string
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
