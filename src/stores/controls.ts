import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  controls as initialControls,
  type Control,
  type ControlStatus,
  type EvidenceState,
} from '@/data/controls'

export interface Evidence {
  id: string
  description: string
  fileType: string
  fileSize: string
  createdAt: string
}

export interface Task {
  id: string
  description: string
  dueDate: string
  assignee: {
    name: string
    initials: string
  }
  status: 'not_started' | 'in_progress' | 'completed'
}

export interface ControlRequirement {
  id: string
  code: string
  framework: string
  title: string
  description: string
}

export interface Risk {
  id: string
  description: string
  level: 'Low' | 'Medium' | 'High' | 'Critical'
}

export interface Document {
  id: string
  name: string
  version: string
  status: 'Draft' | 'Under Review' | 'Approved'
}

export interface ThirdParty {
  id: string
  name: string
  service: string
  status: 'Approved' | 'Pending Review' | 'Critical Risk'
}

export interface ControlDetail extends Control {
  description: string
  evidences: Evidence[]
  tasks: Task[]
  requirements: ControlRequirement[]
  risks: Risk[]
  documents: Document[]
  thirdParties: ThirdParty[]
}

// Initial mock details for controls
const initialDetails: Record<string, Partial<ControlDetail>> = {
  'CC6.1': {
    description:
      'Logical access permissions to systems and data are granted based on business needs and approved access requests. Access is periodically reviewed and revoked upon termination of role.',
    evidences: [
      {
        id: 'ev-101',
        description: 'Access request forms sample Q2',
        fileType: 'PDF',
        fileSize: '1.4 MB',
        createdAt: '2026-06-10',
      },
      {
        id: 'ev-102',
        description: 'AD user list and authorization matrix',
        fileType: 'Spreadsheet',
        fileSize: '850 KB',
        createdAt: '2026-07-02',
      },
    ],
    tasks: [],
    requirements: [
      {
        id: 'req-101',
        code: 'CC6.1',
        framework: 'SOC 2',
        title: 'Access Authorization',
        description:
          'The entity authorizes, modifies, and terminates access to resources based on roles and permissions.',
      },
    ],
    risks: [
      {
        id: 'rsk-101',
        description: 'Orphaned accounts with active access to sensitive codebases',
        level: 'High',
      },
    ],
    documents: [
      { id: 'doc-101', name: 'Access Control Policy', version: 'v3.2', status: 'Approved' },
    ],
    thirdParties: [
      {
        id: 'tp-101',
        name: 'Okta Identity Cloud',
        service: 'Access Provisioning & Identity',
        status: 'Approved',
      },
    ],
  },
  'CC6.2': {
    description:
      'Multi-factor authentication (MFA) is enforced for all administrative and user access to production databases, cloud management consoles, and corporate network access.',
    evidences: [
      {
        id: 'ev-201',
        description: 'Okta MFA global policy settings report',
        fileType: 'PDF',
        fileSize: '2.1 MB',
        createdAt: '2026-07-05',
      },
      {
        id: 'ev-202',
        description: 'AWS IAM MFA enforcement configuration',
        fileType: 'JSON',
        fileSize: '12 KB',
        createdAt: '2026-07-10',
      },
      {
        id: 'ev-203',
        description: 'MFA compliance report - Github organizations',
        fileType: 'Screenshot',
        fileSize: '450 KB',
        createdAt: '2026-07-12',
      },
    ],
    tasks: [],
    requirements: [
      {
        id: 'req-201',
        code: 'CC6.2',
        framework: 'SOC 2',
        title: 'User Registration & Access',
        description:
          'Prior to issuing credentials and granting access, the entity establishes the identity of authorized users.',
      },
      {
        id: 'req-202',
        code: 'A.9.4.2',
        framework: 'ISO 27001',
        title: 'Secure Log-on Procedures',
        description:
          'Access to systems and applications shall be controlled by a secure log-on procedure.',
      },
      {
        id: 'req-203',
        code: 'Art.32',
        framework: 'GDPR',
        title: 'Security of Processing',
        description:
          'Implement appropriate technical and organizational measures to ensure a level of security appropriate to the risk.',
      },
    ],
    risks: [
      {
        id: 'rsk-201',
        description: 'Compromised admin credentials via phishing attacks',
        level: 'Critical',
      },
    ],
    documents: [
      { id: 'doc-201', name: 'Information Security Policy', version: 'v3.2', status: 'Approved' },
      {
        id: 'doc-202',
        name: 'Password and Credentials Procedure',
        version: 'v1.4',
        status: 'Under Review',
      },
    ],
    thirdParties: [
      {
        id: 'tp-201',
        name: 'Okta Identity Cloud',
        service: 'Access Provisioning & Identity',
        status: 'Approved',
      },
      { id: 'tp-202', name: 'Duo Security', service: 'Backup MFA Provider', status: 'Approved' },
    ],
  },
  'CC6.3': {
    description:
      'Privileged access credentials (admin, root, superuser) are strictly limited, monitored, and require a formal authorization flow. Shared admin accounts are strictly prohibited.',
    evidences: [
      {
        id: 'ev-301',
        description: 'PAM tool access logs for production databases',
        fileType: 'JSON',
        fileSize: '3.4 MB',
        createdAt: '2026-07-01',
      },
    ],
    tasks: [],
    requirements: [
      {
        id: 'req-301',
        code: 'CC6.3',
        framework: 'SOC 2',
        title: 'Privileged Access Control',
        description: 'The entity restricts privileged access rights and manages credentials.',
      },
      {
        id: 'req-302',
        code: 'A.9.2.3',
        framework: 'ISO 27001',
        title: 'Management of Privileged Access Rights',
        description:
          'The allocation and use of privileged access rights shall be restricted and controlled.',
      },
    ],
    risks: [
      {
        id: 'rsk-301',
        description: 'Abuse of administrative accounts leading to data leakage',
        level: 'High',
      },
    ],
    documents: [
      { id: 'doc-301', name: 'Access Control Policy', version: 'v3.2', status: 'Approved' },
    ],
    thirdParties: [],
  },
}

export const useControlsStore = defineStore('controls', () => {
  const list = ref<ControlDetail[]>(
    initialControls.map((c) => {
      const details = initialDetails[c.code] || {}
      return {
        ...c,
        description:
          details.description ||
          `${c.name} control implemented to comply with ${c.frameworks.map((f) => f.toUpperCase()).join(', ')}.`,
        evidences: details.evidences || [],
        tasks: details.tasks || [],
        requirements: details.requirements || [],
        risks: details.risks || [],
        documents: details.documents || [],
        thirdParties: details.thirdParties || [],
      }
    }),
  )

  function getControlByCode(code: string): ControlDetail | undefined {
    return list.value.find((c) => c.code === code)
  }

  function addControl(newControl: {
    code: string
    name: string
    description?: string
    frameworks: ('soc2' | 'iso27001' | 'gdpr')[]
    owner: { id: string; name: string; initials: string }
    status: ControlStatus
    evidence: EvidenceState
  }) {
    const codeExists = list.value.some((c) => c.code === newControl.code)
    if (codeExists) return false

    const fullControl: ControlDetail = {
      code: newControl.code,
      name: newControl.name,
      description: newControl.description || `${newControl.name} security control.`,
      frameworks: newControl.frameworks,
      owner: newControl.owner,
      status: newControl.status,
      evidence: newControl.evidence,
      nextReview: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '', // 30 days from now
      evidences: [],
      tasks: [],
      requirements: [],
      risks: [],
      documents: [],
      thirdParties: [],
    }

    list.value.unshift(fullControl)
    return true
  }

  function updateControlStatus(code: string, status: ControlStatus) {
    const ctrl = getControlByCode(code)
    if (ctrl) {
      ctrl.status = status
      // Automatically map evidence state based on status for simulated behavior
      if (status === 'passing') {
        ctrl.evidence = 'fresh'
      } else if (status === 'attention') {
        ctrl.evidence = 'expiring'
      } else {
        ctrl.evidence = 'expired'
      }
    }
  }

  function updateControlDescription(code: string, description: string) {
    const ctrl = getControlByCode(code)
    if (ctrl) {
      ctrl.description = description
    }
  }

  function updateControlDetails(
    code: string,
    updated: { name: string; description: string; ownerId: string },
  ) {
    const ctrl = getControlByCode(code)
    if (ctrl) {
      ctrl.name = updated.name
      ctrl.description = updated.description
      // Resolve owner by ownerId
      const owners: Record<string, { id: string; name: string; initials: string }> = {
        maya: { id: 'maya', name: 'Maya Chen', initials: 'MC' },
        daniel: { id: 'daniel', name: 'Daniel Kim', initials: 'DK' },
        aisha: { id: 'aisha', name: 'Aisha Patel', initials: 'AP' },
        josh: { id: 'josh', name: 'Josh Lee', initials: 'JL' },
        sophie: { id: 'sophie', name: 'Sophie Martin', initials: 'SM' },
        ravi: { id: 'ravi', name: 'Ravi Singh', initials: 'RS' },
        priya: { id: 'priya', name: 'Priya Shah', initials: 'PS' },
      }
      const selectedOwner = owners[updated.ownerId]
      if (selectedOwner) {
        ctrl.owner = selectedOwner
      }
    }
  }

  function deleteControl(code: string) {
    const idx = list.value.findIndex((c) => c.code === code)
    if (idx !== -1) {
      list.value.splice(idx, 1)
      return true
    }
    return false
  }

  // Evidence Management
  function addEvidence(code: string, evidence: Omit<Evidence, 'id' | 'createdAt'>) {
    const ctrl = getControlByCode(code)
    if (ctrl) {
      const newEv: Evidence = {
        id: `ev-${Date.now()}`,
        description: evidence.description,
        fileType: evidence.fileType,
        fileSize: evidence.fileSize,
        createdAt: new Date().toISOString().split('T')[0] || '',
      }
      ctrl.evidences.push(newEv)
      ctrl.evidence = 'fresh' // reset evidence to fresh on new upload
    }
  }

  function removeEvidence(code: string, id: string) {
    const ctrl = getControlByCode(code)
    if (ctrl) {
      ctrl.evidences = ctrl.evidences.filter((e) => e.id !== id)
      if (ctrl.evidences.length === 0) {
        ctrl.evidence = 'expired'
      }
    }
  }

  // Task Management
  function addTask(code: string, task: Omit<Task, 'id' | 'status'>) {
    const ctrl = getControlByCode(code)
    if (ctrl) {
      const newT: Task = {
        id: `task-${Date.now()}`,
        description: task.description,
        dueDate: task.dueDate,
        assignee: task.assignee,
        status: 'not_started',
      }
      ctrl.tasks.push(newT)
    }
  }

  function toggleTaskStatus(code: string, taskId: string) {
    const ctrl = getControlByCode(code)
    if (ctrl) {
      const t = ctrl.tasks.find((task) => task.id === taskId)
      if (t) {
        if (t.status === 'not_started') t.status = 'in_progress'
        else if (t.status === 'in_progress') t.status = 'completed'
        else t.status = 'not_started'
      }
    }
  }

  function removeTask(code: string, id: string) {
    const ctrl = getControlByCode(code)
    if (ctrl) {
      ctrl.tasks = ctrl.tasks.filter((t) => t.id !== id)
    }
  }

  // Requirements linking
  function linkRequirement(code: string, req: ControlRequirement) {
    const ctrl = getControlByCode(code)
    if (ctrl) {
      if (
        !ctrl.requirements.some(
          (r) => r.id === req.id || (r.code === req.code && r.framework === req.framework),
        )
      ) {
        ctrl.requirements.push(req)
      }
    }
  }

  function unlinkRequirement(code: string, id: string) {
    const ctrl = getControlByCode(code)
    if (ctrl) {
      ctrl.requirements = ctrl.requirements.filter((r) => r.id !== id)
    }
  }

  // Risks linking
  function linkRisk(code: string, risk: Risk) {
    const ctrl = getControlByCode(code)
    if (ctrl) {
      if (!ctrl.risks.some((r) => r.id === risk.id)) {
        ctrl.risks.push(risk)
      }
    }
  }

  function unlinkRisk(code: string, id: string) {
    const ctrl = getControlByCode(code)
    if (ctrl) {
      ctrl.risks = ctrl.risks.filter((r) => r.id !== id)
    }
  }

  // Documents linking
  function linkDocument(code: string, doc: Document) {
    const ctrl = getControlByCode(code)
    if (ctrl) {
      if (!ctrl.documents.some((d) => d.id === doc.id)) {
        ctrl.documents.push(doc)
      }
    }
  }

  function unlinkDocument(code: string, id: string) {
    const ctrl = getControlByCode(code)
    if (ctrl) {
      ctrl.documents = ctrl.documents.filter((d) => d.id !== id)
    }
  }

  // Third party linking
  function linkThirdParty(code: string, tp: ThirdParty) {
    const ctrl = getControlByCode(code)
    if (ctrl) {
      if (!ctrl.thirdParties.some((t) => t.id === tp.id)) {
        ctrl.thirdParties.push(tp)
      }
    }
  }

  function unlinkThirdParty(code: string, id: string) {
    const ctrl = getControlByCode(code)
    if (ctrl) {
      ctrl.thirdParties = ctrl.thirdParties.filter((t) => t.id !== id)
    }
  }

  return {
    list,
    getControlByCode,
    addControl,
    updateControlStatus,
    updateControlDescription,
    updateControlDetails,
    deleteControl,
    addEvidence,
    removeEvidence,
    addTask,
    toggleTaskStatus,
    removeTask,
    linkRequirement,
    unlinkRequirement,
    linkRisk,
    unlinkRisk,
    linkDocument,
    unlinkDocument,
    linkThirdParty,
    unlinkThirdParty,
  }
})
