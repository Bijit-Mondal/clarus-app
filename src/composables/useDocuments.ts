import { ref, computed } from 'vue'

export interface DocumentVersion {
  version: string
  updatedAt: string
  owner: string
  changelog: string
  content: string
}

export interface DocumentActivity {
  id: string
  user: string
  action: string
  timestamp: string
}

export interface DocumentComment {
  id: string
  user: string
  content: string
  timestamp: string
}

export interface MappedControl {
  controlKey: string
  name: string
  implementationStatus: 'implemented' | 'in_progress' | 'not_started' | 'not_applicable'
}

export interface DocumentItem {
  id: string
  code: string
  title: string
  description: string
  category: 'policy' | 'procedure' | 'sop'
  version: string
  status: 'approved' | 'in-review' | 'draft'
  owner: string
  updatedAt: string
  controlsCount: number
  fileSize: string
  classification: 'Public' | 'Internal' | 'Confidential' | 'Restricted'
  approvers: string[]
  content: string
  versions: DocumentVersion[]
  activity: DocumentActivity[]
  comments: DocumentComment[]
  mappedControls: MappedControl[]
}

const initialDocuments: DocumentItem[] = [
  {
    id: 'doc-1',
    code: 'POL-01',
    title: 'Information Security Policy',
    description:
      'High-level security directives governing all organization compliance requirements.',
    category: 'policy',
    version: 'v2.4',
    status: 'approved',
    owner: 'Sarah Connor',
    updatedAt: '3 days ago',
    controlsCount: 3,
    fileSize: '2.4 MB',
    classification: 'Internal',
    approvers: ['Sarah Connor', 'David Miller'],
    content: `<h1>Information Security Policy</h1>
<p>This policy defines the high-level security directives governing all organization compliance requirements at Clarus.</p>
<h2>1. Objective</h2>
<p>To establish a robust information security management system (ISMS) that protects the confidentiality, integrity, and availability of organization and client data.</p>
<h2>2. Scope</h2>
<p>This policy applies to all employees, contractors, partners, and third-party systems interacting with corporate resources.</p>
<h2>3. Security Standards</h2>
<p>All corporate resources must comply with the SOC 2 security framework and ISO 27001 requirements. Security reviews are scheduled annually.</p>`,
    versions: [
      {
        version: 'v2.3',
        updatedAt: '1 month ago',
        owner: 'Sarah Connor',
        changelog: 'Updated MFA compliance references and access control standards.',
        content:
          '<h1>Information Security Policy v2.3</h1><p>Older version of policy content...</p>',
      },
      {
        version: 'v2.0',
        updatedAt: '3 months ago',
        owner: 'Sarah Connor',
        changelog: 'Initial revision for security posture audit.',
        content: '<h1>Information Security Policy v2.0</h1><p>Initial release...</p>',
      },
    ],
    activity: [
      {
        id: 'act-1',
        user: 'Sarah Connor',
        action: 'Approved the document',
        timestamp: '3 days ago',
      },
      {
        id: 'act-2',
        user: 'David Miller',
        action: 'Approved the document',
        timestamp: '4 days ago',
      },
      {
        id: 'act-3',
        user: 'Sarah Connor',
        action: 'Updated policy content',
        timestamp: '5 days ago',
      },
    ],
    comments: [
      {
        id: 'com-1',
        user: 'David Miller',
        content: 'Looks solid. I verified it matches the SOC 2 trust principles.',
        timestamp: '4 days ago',
      },
      {
        id: 'com-2',
        user: 'Sarah Connor',
        content: 'Please review the updated firewall rules in section 4.',
        timestamp: '5 days ago',
      },
    ],
    mappedControls: [
      { controlKey: 'CC6.1', name: 'Access Authorization', implementationStatus: 'implemented' },
      {
        controlKey: 'CC6.2',
        name: 'User Registration and Access Provisioning',
        implementationStatus: 'implemented',
      },
      {
        controlKey: 'CC6.3',
        name: 'Access Modification and Revocation',
        implementationStatus: 'implemented',
      },
    ],
  },
  {
    id: 'doc-2',
    code: 'SOP-01',
    title: 'Access Control Procedure',
    description:
      'Standard operating procedure for provisioning, reviewing, and deprovisioning user access.',
    category: 'procedure',
    version: 'v1.8',
    status: 'approved',
    owner: 'David Miller',
    updatedAt: '1 week ago',
    controlsCount: 2,
    fileSize: '1.2 MB',
    classification: 'Confidential',
    approvers: ['David Miller'],
    content: `<h1>Access Control Procedure</h1>
<p>This standard operating procedure defines the process for provisioning, reviewing, and deprovisioning user access to systems and services.</p>
<h2>1. User Provisioning</h2>
<p>Access requests must be approved by the department manager and documented in the ticketing system before credentials are issued.</p>
<h2>2. Access Reviews</h2>
<p>Access reviews are conducted quarterly by the security team to ensure access permissions map directly to current business roles.</p>
<h2>3. Revocation</h2>
<p>Upon notification of termination, user access must be disabled within 24 hours of employee departure.</p>`,
    versions: [
      {
        version: 'v1.7',
        updatedAt: '2 months ago',
        owner: 'David Miller',
        changelog: 'Added deprovisioning SLA timeline.',
        content: '<h1>Access Control Procedure v1.7</h1><p>Deprovisioning guidelines...</p>',
      },
    ],
    activity: [
      {
        id: 'act-4',
        user: 'David Miller',
        action: 'Published version v1.8',
        timestamp: '1 week ago',
      },
      {
        id: 'act-5',
        user: 'David Miller',
        action: 'Updated procedure content',
        timestamp: '1 week ago',
      },
    ],
    comments: [
      {
        id: 'com-3',
        user: 'Alex Rivera',
        content: 'The SLA of 24h is aligned with the security policy requirements.',
        timestamp: '1 week ago',
      },
    ],
    mappedControls: [
      {
        controlKey: 'CC6.2',
        name: 'User Registration and Access Provisioning',
        implementationStatus: 'implemented',
      },
      {
        controlKey: 'CC6.3',
        name: 'Access Modification and Revocation',
        implementationStatus: 'implemented',
      },
    ],
  },
  {
    id: 'doc-3',
    code: 'POL-02',
    title: 'Incident Response Plan',
    description: 'Guidelines for identifying, containing, and communicating security incidents.',
    category: 'policy',
    version: 'v2.0',
    status: 'approved',
    owner: 'Sarah Connor',
    updatedAt: '2 weeks ago',
    controlsCount: 1,
    fileSize: '3.1 MB',
    classification: 'Internal',
    approvers: ['Sarah Connor', 'Virat Kohli'],
    content: `<h1>Incident Response Plan</h1>
<p>This plan outlines the response process for security incidents at the organization.</p>
<h2>1. Phases of Response</h2>
<p>Clarus incident response includes the following phases: Detection, Analysis, Containment, Eradication, Recovery, and Post-Incident Activities.</p>
<h2>2. Response Team</h2>
<p>The Incident Response Team (IRT) is led by the Security Director and includes representatives from engineering, legal, and public relations.</p>`,
    versions: [],
    activity: [
      {
        id: 'act-6',
        user: 'Sarah Connor',
        action: 'Approved the document',
        timestamp: '2 weeks ago',
      },
    ],
    comments: [],
    mappedControls: [
      {
        controlKey: 'CC7.3',
        name: 'Incident Containment and Recovery',
        implementationStatus: 'implemented',
      },
    ],
  },
  {
    id: 'doc-4',
    code: 'SOP-02',
    title: 'Data Classification & Retention Procedure',
    description: 'Instructions on handling, tagging, and retaining client and organizational data.',
    category: 'procedure',
    version: 'v1.2',
    status: 'in-review',
    owner: 'David Miller',
    updatedAt: 'Yesterday',
    controlsCount: 1,
    fileSize: '950 KB',
    classification: 'Confidential',
    approvers: ['David Miller', 'Virat Kohli'],
    content: `<h1>Data Classification & Retention Procedure</h1>
<p>This procedure provides guidance on categorizing data assets and defines retention periods for each data tier.</p>
<h2>1. Classification Levels</h2>
<p>Data must be classified into one of the following categories: Public, Internal, Confidential, or Restricted.</p>
<h2>2. Retention Guidelines</h2>
<p>Client records must be retained for at least 7 years. Security audit logs must be retained for a minimum of 1 year.</p>`,
    versions: [
      {
        version: 'v1.1',
        updatedAt: '3 months ago',
        owner: 'David Miller',
        changelog: 'Minor typo fixes and adjustments to storage locations.',
        content: '<h1>Data Classification & Retention v1.1</h1>',
      },
    ],
    activity: [
      {
        id: 'act-7',
        user: 'David Miller',
        action: 'Requested approval for version v1.2',
        timestamp: 'Yesterday',
      },
      {
        id: 'act-8',
        user: 'David Miller',
        action: 'Edited data classification details',
        timestamp: 'Yesterday',
      },
    ],
    comments: [
      {
        id: 'com-4',
        user: 'Virat Kohli',
        content: 'Checking the retention legal requirements. Will approve by Monday.',
        timestamp: 'Yesterday',
      },
    ],
    mappedControls: [
      { controlKey: 'CC6.1', name: 'Access Authorization', implementationStatus: 'implemented' },
    ],
  },
  {
    id: 'doc-5',
    code: 'POL-03',
    title: 'Vulnerability Management Policy',
    description:
      'Requirements for regular vulnerability scans, penetration testing, and software patches.',
    category: 'policy',
    version: 'v1.0',
    status: 'draft',
    owner: 'Alex Rivera',
    updatedAt: 'Just now',
    controlsCount: 0,
    fileSize: '1.4 MB',
    classification: 'Internal',
    approvers: ['Alex Rivera'],
    content: `<h1>Vulnerability Management Policy</h1>
<p>This policy details requirements for vulnerability detection, patching timelines, and remediation reporting.</p>
<h2>1. Vulnerability Scanning</h2>
<p>Infrastructure scans must be performed monthly. Application code dependency checks are automated with each build.</p>
<h2>2. SLA for Patching</h2>
<p>Critical vulnerabilities must be patched within 14 days. High vulnerabilities must be patched within 30 days. Medium and low vulnerabilities should be patched as part of regular release cycles.</p>`,
    versions: [],
    activity: [
      {
        id: 'act-9',
        user: 'Alex Rivera',
        action: 'Created draft version v1.0',
        timestamp: 'Just now',
      },
    ],
    comments: [],
    mappedControls: [],
  },
]

// Create a globally accessible reactive reference for documents to act as a singleton store
const documentsList = ref<DocumentItem[]>(initialDocuments)

export function useDocuments() {
  const documents = computed(() => documentsList.value)

  function getDocumentById(id: string): DocumentItem | undefined {
    return documentsList.value.find((doc) => doc.id === id)
  }

  function updateDocument(id: string, updates: Partial<DocumentItem>) {
    const index = documentsList.value.findIndex((doc) => doc.id === id)
    if (index !== -1) {
      const doc = documentsList.value[index]
      documentsList.value[index] = {
        ...doc,
        ...updates,
        updatedAt: 'Just now',
      } as DocumentItem
      return documentsList.value[index]
    }
  }

  function addActivity(id: string, action: string, user: string = 'Virat Kohli') {
    const doc = getDocumentById(id)
    if (doc) {
      const newActivity: DocumentActivity = {
        id: `act-${Date.now()}`,
        user,
        action,
        timestamp: 'Just now',
      }
      doc.activity.unshift(newActivity)
    }
  }

  function addComment(id: string, content: string, user: string = 'Virat Kohli') {
    const doc = getDocumentById(id)
    if (doc) {
      const newComment: DocumentComment = {
        id: `com-${Date.now()}`,
        user,
        content,
        timestamp: 'Just now',
      }
      doc.comments.unshift(newComment)
      addActivity(id, 'Added a comment', user)
    }
  }

  function publishVersion(
    id: string,
    payload: { changelog: string; approvers: string[]; versionType: 'minor' | 'major' },
  ) {
    const doc = getDocumentById(id)
    if (doc) {
      // Archive current version
      const oldVersion: DocumentVersion = {
        version: doc.version,
        updatedAt: doc.updatedAt,
        owner: doc.owner,
        changelog: payload.changelog || 'No changelog provided.',
        content: doc.content,
      }

      // Calculate next version
      let nextVersion = doc.version
      const versionNumber = parseFloat(doc.version.replace(/[^\d.]/g, '')) || 1.0
      if (payload.versionType === 'major') {
        nextVersion = `v${Math.floor(versionNumber + 1)}.0`
      } else {
        nextVersion = `v${(versionNumber + 0.1).toFixed(1)}`
      }

      doc.versions.unshift(oldVersion)
      doc.version = nextVersion
      doc.approvers = payload.approvers
      doc.status = 'approved'
      doc.updatedAt = 'Just now'

      addActivity(id, `Published version ${nextVersion}`, doc.owner)
    }
  }

  function requestApproval(id: string, payload: { changelog: string; approvers: string[] }) {
    const doc = getDocumentById(id)
    if (doc) {
      doc.status = 'in-review'
      doc.approvers = payload.approvers
      doc.updatedAt = 'Just now'
      addActivity(id, `Requested approval for version ${doc.version}`, doc.owner)
    }
  }

  function addMappedControl(id: string, control: MappedControl) {
    const doc = getDocumentById(id)
    if (doc && !doc.mappedControls.some((c) => c.controlKey === control.controlKey)) {
      doc.mappedControls.push(control)
      doc.controlsCount = doc.mappedControls.length
      addActivity(id, `Linked control ${control.controlKey}`, doc.owner)
    }
  }

  function removeMappedControl(id: string, controlKey: string) {
    const doc = getDocumentById(id)
    if (doc) {
      doc.mappedControls = doc.mappedControls.filter((c) => c.controlKey !== controlKey)
      doc.controlsCount = doc.mappedControls.length
      addActivity(id, `Unlinked control ${controlKey}`, doc.owner)
    }
  }

  function createDocument(
    payload: Omit<
      DocumentItem,
      | 'id'
      | 'version'
      | 'status'
      | 'updatedAt'
      | 'controlsCount'
      | 'fileSize'
      | 'versions'
      | 'activity'
      | 'comments'
      | 'mappedControls'
    >,
  ) {
    const id = `doc-${Date.now()}`
    const newDoc: DocumentItem = {
      ...payload,
      id,
      version: 'v1.0',
      status: 'draft',
      updatedAt: 'Just now',
      controlsCount: 0,
      fileSize: '10 KB',
      versions: [],
      activity: [
        {
          id: `act-${Date.now()}`,
          user: payload.owner,
          action: 'Created draft document',
          timestamp: 'Just now',
        },
      ],
      comments: [],
      mappedControls: [],
    }
    documentsList.value.push(newDoc)
    return newDoc
  }

  return {
    documents,
    getDocumentById,
    updateDocument,
    addActivity,
    addComment,
    publishVersion,
    requestApproval,
    addMappedControl,
    removeMappedControl,
    createDocument,
  }
}
