import { ref, computed, type Ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getDocuments, type TenantDocument } from '@/api/documents'
import { useOrganizationStore } from '@/stores/organization'

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

// Create a globally accessible reactive reference for documents to act as a singleton store
const documentsList = ref<DocumentItem[]>([])

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

export const documentKeys = {
  all: ['documents'] as const,
  list: (tenantId: string, options: Record<string, unknown>) =>
    [...documentKeys.all, tenantId, 'list', options] as const,
}

export function formatTimeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  if (isNaN(diffMs) || diffMs < 0) return 'Just now'
  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export function mapTenantDocumentToItem(doc: TenantDocument): DocumentItem {
  const prefix = (doc.documentType || 'doc').toUpperCase().slice(0, 3)
  const code = `${prefix}-${doc.$id.slice(-4)}`
  return {
    id: doc.$id,
    code,
    title: doc.title,
    description: doc.descriptionSnippet || '',
    category: doc.documentType as 'policy' | 'procedure' | 'sop',
    version: `v${doc.major ?? 0}.${doc.minor ?? 0}`,
    status: (doc.versionStatus || 'draft') as 'approved' | 'in-review' | 'draft',
    owner: 'Sarah Connor',
    updatedAt: doc.$updatedAt ? formatTimeAgo(doc.$updatedAt) : 'Just now',
    controlsCount: doc.mappedControlsCount || 0,
    fileSize: '1.5 MB',
    classification: (doc.classification
      ? doc.classification.charAt(0).toUpperCase() + doc.classification.slice(1)
      : 'Internal') as 'Public' | 'Internal' | 'Confidential' | 'Restricted',
    approvers: ['Sarah Connor'],
    content: `<h1>${doc.title}</h1><p>Start writing the content for ${doc.title} here...</p>`,
    versions: [],
    activity: [],
    comments: [],
    mappedControls: [],
  }
}

export function useDocumentsQuery(
  options?:
    | Ref<{ documentType?: string; limit?: number; offset?: number }>
    | { documentType?: string; limit?: number; offset?: number },
) {
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)
  const optionsVal = computed(() => (options && 'value' in options ? options.value : options))

  return useQuery({
    queryKey: computed(() => {
      const tId = tenantId.value || ''
      const opts = optionsVal.value || {}
      return documentKeys.list(tId, opts)
    }),
    queryFn: async () => {
      const res = await getDocuments(tenantId.value!, optionsVal.value)
      if (res && res.documents) {
        res.documents.forEach((doc) => {
          const item = mapTenantDocumentToItem(doc)
          const index = documentsList.value.findIndex((d) => d.id === item.id)
          if (index !== -1) {
            documentsList.value[index] = {
              ...item,
              content: documentsList.value[index]!.content || item.content,
              versions: documentsList.value[index]!.versions.length
                ? documentsList.value[index]!.versions
                : item.versions,
              activity: documentsList.value[index]!.activity.length
                ? documentsList.value[index]!.activity
                : item.activity,
              comments: documentsList.value[index]!.comments.length
                ? documentsList.value[index]!.comments
                : item.comments,
              mappedControls: documentsList.value[index]!.mappedControls.length
                ? documentsList.value[index]!.mappedControls
                : item.mappedControls,
            }
          } else {
            documentsList.value.push(item)
          }
        })
      }
      return res
    },
    enabled: computed(() => !!tenantId.value),
    staleTime: 300_000,
  })
}
