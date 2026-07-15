export type FrameworkId = 'soc2' | 'iso27001' | 'gdpr'

export type ControlStatus = 'passing' | 'attention' | 'failing' | 'not_started' | 'not_applicable'

export type EvidenceState = 'fresh' | 'expiring' | 'expired'

export interface Framework {
  id: FrameworkId
  label: string
  /** Days until the next scheduled program review for this framework. */
  reviewInDays: number
}

export interface Owner {
  id: string
  name: string
  initials: string
}

export interface Control {
  /** Recognizable control code, e.g. CC6.2 or A.9.2. */
  code: string
  name: string
  frameworks: FrameworkId[]
  owner: Owner
  status: ControlStatus
  evidence: EvidenceState
  /** ISO date of the next scheduled review. */
  nextReview: string
}

export const FRAMEWORKS: Record<FrameworkId, Framework> = {
  soc2: { id: 'soc2', label: 'SOC 2', reviewInDays: 12 },
  iso27001: { id: 'iso27001', label: 'ISO 27001', reviewInDays: 34 },
  gdpr: { id: 'gdpr', label: 'GDPR', reviewInDays: 58 },
}

export const FRAMEWORK_ORDER: FrameworkId[] = ['soc2', 'iso27001', 'gdpr']

const OWNERS = {
  maya: { id: 'maya', name: 'Maya Chen', initials: 'MC' },
  daniel: { id: 'daniel', name: 'Daniel Kim', initials: 'DK' },
  aisha: { id: 'aisha', name: 'Aisha Patel', initials: 'AP' },
  josh: { id: 'josh', name: 'Josh Lee', initials: 'JL' },
  sophie: { id: 'sophie', name: 'Sophie Martin', initials: 'SM' },
  ravi: { id: 'ravi', name: 'Ravi Singh', initials: 'RS' },
  priya: { id: 'priya', name: 'Priya Shah', initials: 'PS' },
} satisfies Record<string, Owner>

export const OWNER_LIST: Owner[] = Object.values(OWNERS)

export const controls: Control[] = [
  {
    code: 'CC6.1',
    name: 'Logical access provisioning',
    frameworks: ['soc2', 'iso27001'],
    owner: OWNERS.maya,
    status: 'passing',
    evidence: 'fresh',
    nextReview: '2026-08-20',
  },
  {
    code: 'CC6.2',
    name: 'Multi-factor authentication',
    frameworks: ['soc2', 'iso27001', 'gdpr'],
    owner: OWNERS.daniel,
    status: 'passing',
    evidence: 'fresh',
    nextReview: '2026-07-18',
  },
  {
    code: 'CC6.3',
    name: 'Privileged access management',
    frameworks: ['soc2', 'iso27001'],
    owner: OWNERS.aisha,
    status: 'attention',
    evidence: 'expiring',
    nextReview: '2026-07-15',
  },
  {
    code: 'CC6.6',
    name: 'Encryption in transit',
    frameworks: ['soc2', 'iso27001', 'gdpr'],
    owner: OWNERS.josh,
    status: 'passing',
    evidence: 'fresh',
    nextReview: '2026-09-02',
  },
  {
    code: 'CC6.7',
    name: 'Encryption at rest',
    frameworks: ['soc2', 'iso27001', 'gdpr'],
    owner: OWNERS.sophie,
    status: 'passing',
    evidence: 'fresh',
    nextReview: '2026-08-11',
  },
  {
    code: 'CC7.2',
    name: 'Security event monitoring',
    frameworks: ['soc2', 'iso27001'],
    owner: OWNERS.ravi,
    status: 'attention',
    evidence: 'expiring',
    nextReview: '2026-07-12',
  },
  {
    code: 'CC7.3',
    name: 'Incident response plan',
    frameworks: ['soc2', 'iso27001', 'gdpr'],
    owner: OWNERS.maya,
    status: 'passing',
    evidence: 'fresh',
    nextReview: '2026-08-28',
  },
  {
    code: 'CC8.1',
    name: 'Change management',
    frameworks: ['soc2', 'iso27001'],
    owner: OWNERS.daniel,
    status: 'passing',
    evidence: 'fresh',
    nextReview: '2026-09-15',
  },
  {
    code: 'CC9.2',
    name: 'Vendor risk management',
    frameworks: ['soc2', 'iso27001'],
    owner: OWNERS.priya,
    status: 'failing',
    evidence: 'expired',
    nextReview: '2026-07-09',
  },
  {
    code: 'CC1.4',
    name: 'Background checks',
    frameworks: ['soc2'],
    owner: OWNERS.aisha,
    status: 'passing',
    evidence: 'fresh',
    nextReview: '2026-10-01',
  },
  {
    code: 'CC2.1',
    name: 'Security policy communication',
    frameworks: ['soc2', 'iso27001'],
    owner: OWNERS.sophie,
    status: 'passing',
    evidence: 'fresh',
    nextReview: '2026-09-20',
  },
  {
    code: 'A.5.1',
    name: 'Information security policies',
    frameworks: ['iso27001'],
    owner: OWNERS.maya,
    status: 'passing',
    evidence: 'fresh',
    nextReview: '2026-08-05',
  },
  {
    code: 'A.8.2',
    name: 'Information classification',
    frameworks: ['iso27001', 'gdpr'],
    owner: OWNERS.josh,
    status: 'attention',
    evidence: 'expiring',
    nextReview: '2026-07-14',
  },
  {
    code: 'A.9.2',
    name: 'User access management',
    frameworks: ['iso27001', 'soc2'],
    owner: OWNERS.ravi,
    status: 'passing',
    evidence: 'fresh',
    nextReview: '2026-08-24',
  },
  {
    code: 'A.12.3',
    name: 'Backup and recovery',
    frameworks: ['iso27001'],
    owner: OWNERS.daniel,
    status: 'passing',
    evidence: 'fresh',
    nextReview: '2026-09-08',
  },
  {
    code: 'A.12.6',
    name: 'Technical vulnerability management',
    frameworks: ['iso27001', 'soc2'],
    owner: OWNERS.aisha,
    status: 'failing',
    evidence: 'expired',
    nextReview: '2026-07-10',
  },
  {
    code: 'A.16.1',
    name: 'Incident management procedures',
    frameworks: ['iso27001', 'gdpr'],
    owner: OWNERS.priya,
    status: 'passing',
    evidence: 'fresh',
    nextReview: '2026-08-30',
  },
  {
    code: 'A.17.1',
    name: 'Business continuity planning',
    frameworks: ['iso27001'],
    owner: OWNERS.sophie,
    status: 'attention',
    evidence: 'expiring',
    nextReview: '2026-07-16',
  },
  {
    code: 'Art.30',
    name: 'Records of processing activities',
    frameworks: ['gdpr'],
    owner: OWNERS.maya,
    status: 'passing',
    evidence: 'fresh',
    nextReview: '2026-09-12',
  },
  {
    code: 'Art.32',
    name: 'Security of processing',
    frameworks: ['gdpr', 'soc2', 'iso27001'],
    owner: OWNERS.josh,
    status: 'passing',
    evidence: 'fresh',
    nextReview: '2026-08-18',
  },
  {
    code: 'Art.33',
    name: 'Personal data breach notification',
    frameworks: ['gdpr'],
    owner: OWNERS.ravi,
    status: 'attention',
    evidence: 'expiring',
    nextReview: '2026-07-13',
  },
  {
    code: 'Art.35',
    name: 'Data protection impact assessments',
    frameworks: ['gdpr'],
    owner: OWNERS.priya,
    status: 'failing',
    evidence: 'expired',
    nextReview: '2026-07-08',
  },
  {
    code: 'Art.15',
    name: 'Data subject access requests',
    frameworks: ['gdpr'],
    owner: OWNERS.aisha,
    status: 'passing',
    evidence: 'fresh',
    nextReview: '2026-09-26',
  },
  {
    code: 'Art.17',
    name: 'Right to erasure',
    frameworks: ['gdpr'],
    owner: OWNERS.daniel,
    status: 'passing',
    evidence: 'fresh',
    nextReview: '2026-10-04',
  },
]

export interface StatusSummary {
  passing: number
  attention: number
  failing: number
  not_started: number
  not_applicable: number
  total: number
  /** Weighted readiness: passing = full credit, attention = half, failing = none. */
  readiness: number
}

export function summarize(list: Control[]): StatusSummary {
  const passing = list.filter((c) => c.status === 'passing').length
  const attention = list.filter((c) => c.status === 'attention').length
  const failing = list.filter((c) => c.status === 'failing').length
  const not_started = list.filter((c) => c.status === 'not_started').length
  const not_applicable = list.filter((c) => c.status === 'not_applicable').length
  const total = list.length
  const readiness = total === 0 ? 0 : Math.round(((passing + attention * 0.5) / total) * 100)
  return { passing, attention, failing, not_started, not_applicable, total, readiness }
}

export interface FrameworkProgress extends Framework {
  summary: StatusSummary
}

export function frameworkProgress(list: Control[]): FrameworkProgress[] {
  return FRAMEWORK_ORDER.map((id) => ({
    ...FRAMEWORKS[id],
    summary: summarize(list.filter((c) => c.frameworks.includes(id))),
  }))
}
