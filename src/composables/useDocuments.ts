import { ref, computed, watch, type Ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  getDocuments,
  getDocument,
  updateDocument as patchDocument,
  writeDocument as patchWriteDocument,
  updateDocumentApprovers,
  publishDocumentMajor,
  publishDocumentMinor,
  getDocumentVersions,
  getDocumentVersion,
  getDocumentControls as fetchDocumentControls,
  getDocumentApprovals as fetchDocumentApprovals,
  decideDocumentApproval as patchDecideDocumentApproval,
  type UpdateDocumentInput,
  type WriteDocumentInput,
  type DecideDocumentApprovalInput,
  type TenantDocument,
  type TenantDocumentDetail,
  type DocumentApprover,
} from '@/api/documents'
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

export interface DocumentControlLink {
  tenantControlId: string
  controlKey: string
  name: string
  implementationStatus: string
}

export type DocumentVersionStatus = 'approved' | 'in-review' | 'draft' | 'rejected'
export type DocumentClassification = 'public' | 'internal'

export interface DocumentItem {
  id: string
  code: string
  documentKey: string
  title: string
  description: string
  category: 'policy' | 'procedure' | 'sop'
  version: string
  /** Last published version label (e.g. "v1.0"). Null when never published. */
  currentPublishedVersion: string | null
  /** Version workflow status mapped from API `versionStatus`. */
  status: DocumentVersionStatus
  /** Document record lifecycle mapped from API `status`. */
  lifecycleStatus: string
  owner: string
  updatedAt: string
  classification: DocumentClassification
  approvers: string[]
  approverIds: string[]
  content: string
  versions: DocumentVersion[]
  activity: DocumentActivity[]
}

// Create a globally accessible reactive reference for documents to act as a singleton store
const documentsList = ref<DocumentItem[]>([])
const documentControlLinks = ref<Record<string, DocumentControlLink[]>>({})

export function useDocuments() {
  const documents = computed(() => documentsList.value)

  function getDocumentById(id: string): DocumentItem | undefined {
    return documentsList.value.find((doc) => doc.id === id)
  }

  function getDocumentControls(id: string): DocumentControlLink[] {
    return documentControlLinks.value[id] ?? []
  }

  function linkDocumentControl(id: string, control: DocumentControlLink) {
    const currentLinks = getDocumentControls(id)
    if (currentLinks.some((link) => link.tenantControlId === control.tenantControlId)) return
    documentControlLinks.value[id] = [...currentLinks, control]
  }

  function unlinkDocumentControl(id: string, tenantControlId: string) {
    documentControlLinks.value[id] = getDocumentControls(id).filter(
      (link) => link.tenantControlId !== tenantControlId,
    )
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

  function addActivity(id: string, action: string, user = '') {
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

  function createDocument(
    payload: Omit<
      DocumentItem,
      | 'id'
      | 'version'
      | 'currentPublishedVersion'
      | 'status'
      | 'lifecycleStatus'
      | 'updatedAt'
      | 'versions'
      | 'activity'
    >,
  ) {
    const id = `doc-${Date.now()}`
    const newDoc: DocumentItem = {
      ...payload,
      id,
      documentKey: payload.documentKey || payload.code.toLowerCase(),
      version: 'v0.0',
      currentPublishedVersion: null,
      status: 'draft',
      lifecycleStatus: 'active',
      updatedAt: 'Just now',
      versions: [],
      activity: [
        {
          id: `act-${Date.now()}`,
          user: payload.owner,
          action: 'Created draft document',
          timestamp: 'Just now',
        },
      ],
    }
    documentsList.value.push(newDoc)
    return newDoc
  }

  return {
    documents,
    getDocumentById,
    getDocumentControls,
    linkDocumentControl,
    unlinkDocumentControl,
    updateDocument,
    addActivity,
    publishVersion,
    requestApproval,
    createDocument,
  }
}

export const documentKeys = {
  all: ['documents'] as const,
  list: (tenantId: string, options: Record<string, unknown>) =>
    [...documentKeys.all, tenantId, 'list', options] as const,
  detail: (tenantId: string, documentId: string) =>
    [...documentKeys.all, 'detail', tenantId, documentId] as const,
  versions: (tenantId: string, documentId: string, options?: Record<string, unknown>) =>
    [...documentKeys.all, 'versions', tenantId, documentId, options || {}] as const,
  versionDetail: (tenantId: string, documentId: string, versionId: string) =>
    [...documentKeys.all, 'version', tenantId, documentId, versionId] as const,
  controls: (tenantId: string, documentId: string, options?: Record<string, unknown>) =>
    [...documentKeys.all, 'controls', tenantId, documentId, options || {}] as const,
  approvals: (tenantId: string, documentId: string, options?: Record<string, unknown>) =>
    [...documentKeys.all, 'approvals', tenantId, documentId, options || {}] as const,
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

export function normalizeVersionStatus(versionStatus: string): DocumentVersionStatus {
  const normalized = versionStatus.toLowerCase().replace(/_/g, '-')
  if (normalized === 'approved' || normalized === 'published') return 'approved'
  if (
    normalized === 'in-review' ||
    normalized === 'pending-review' ||
    normalized === 'needs-review'
  ) {
    return 'in-review'
  }
  if (normalized === 'rejected' || normalized === 'declined' || normalized === 'denied') {
    return 'rejected'
  }
  return 'draft'
}

export function formatDocumentVersion(doc: Pick<TenantDocument, 'major' | 'minor'>) {
  return `v${doc.major}.${doc.minor}`
}

function normalizeClassification(value: string): DocumentClassification {
  return value.toLowerCase() === 'public' ? 'public' : 'internal'
}

export function getClassificationLabel(classification: DocumentClassification): string {
  return classification === 'public' ? 'Public' : 'Internal'
}

function normalizeDocumentType(value: string): DocumentItem['category'] {
  if (value === 'policy' || value === 'procedure' || value === 'sop') return value
  return 'policy'
}

function mergeDocumentIntoStore(item: DocumentItem, fromDetail = false) {
  const index = documentsList.value.findIndex((d) => d.id === item.id)
  if (index !== -1) {
    const existing = documentsList.value[index]!
    documentsList.value[index] = {
      ...item,
      // List payloads often omit or empty `content`; never wipe a detail-hydrated body.
      content: fromDetail || item.content ? item.content : existing.content,
      versions: existing.versions.length ? existing.versions : item.versions,
      activity: existing.activity.length ? existing.activity : item.activity,
      approvers: fromDetail
        ? item.approvers
        : existing.approvers.length
          ? existing.approvers
          : item.approvers,
      approverIds: fromDetail
        ? item.approverIds
        : existing.approverIds.length
          ? existing.approverIds
          : item.approverIds,
    }
  } else {
    documentsList.value.push(item)
  }
}

function mapApproversFromApi(approvers?: DocumentApprover[]) {
  const list = approvers ?? []
  return {
    approverIds: list.map((approver) => approver.$id),
    approvers: list.map((approver) => approver.name),
  }
}

export function mapTenantDocumentToItem(doc: TenantDocument): DocumentItem {
  const prefix = (doc.documentType || 'doc').toUpperCase().slice(0, 3)
  const code = `${prefix}-${doc.$id.slice(-4)}`
  const documentKey = doc.documentKey || code.toLowerCase()

  return {
    id: doc.$id,
    code,
    documentKey,
    title: doc.title,
    description: documentKey.replace(/\./g, ' · '),
    category: normalizeDocumentType(doc.documentType),
    version: formatDocumentVersion(doc),
    // API `currentVersion` is a version record id — never show it; format major.minor for UI.
    currentPublishedVersion: doc.currentVersion?.trim() ? formatDocumentVersion(doc) : null,
    status: normalizeVersionStatus(doc.versionStatus || 'draft'),
    lifecycleStatus: doc.status || 'active',
    owner: '',
    updatedAt: doc.$updatedAt ? formatTimeAgo(doc.$updatedAt) : 'Just now',
    classification: normalizeClassification(doc.classification || 'internal'),
    approvers: [],
    approverIds: [],
    content: doc.content,
    versions: [],
    activity: [],
  }
}

export function mapTenantDocumentDetailToItem(doc: TenantDocumentDetail): DocumentItem {
  const base = mapTenantDocumentToItem(doc)
  const { approverIds, approvers } = mapApproversFromApi(doc.approvers)
  return {
    ...base,
    content: doc.content,
    approverIds,
    approvers,
  }
}

export function useDocumentQuery(documentId: Ref<string> | string) {
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)
  const documentIdVal = computed(() =>
    typeof documentId === 'string' ? documentId : documentId.value,
  )

  const query = useQuery({
    queryKey: computed(() => documentKeys.detail(tenantId.value || '', documentIdVal.value || '')),
    queryFn: () => getDocument(tenantId.value!, documentIdVal.value!),
    enabled: computed(() => !!tenantId.value && !!documentIdVal.value),
    staleTime: 300_000,
  })

  // Re-hydrate the module store from cache/network data. queryFn alone is not enough:
  // returning to a detail page within staleTime skips queryFn, so the editor would
  // otherwise bind to a store entry that list merges may have emptied.
  watch(
    () => query.data.value,
    (doc) => {
      if (doc) mergeDocumentIntoStore(mapTenantDocumentDetailToItem(doc), true)
    },
    { immediate: true },
  )

  return query
}

export function useDocumentVersionsQuery(
  documentId: Ref<string> | string,
  options?: Ref<{ limit?: number; offset?: number }> | { limit?: number; offset?: number },
) {
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)
  const documentIdVal = computed(() =>
    typeof documentId === 'string' ? documentId : documentId.value,
  )
  const optionsVal = computed(() => (options && 'value' in options ? options.value : options))

  return useQuery({
    queryKey: computed(() =>
      documentKeys.versions(tenantId.value || '', documentIdVal.value || '', optionsVal.value),
    ),
    queryFn: async () => {
      return getDocumentVersions(tenantId.value!, documentIdVal.value!, optionsVal.value)
    },
    enabled: computed(() => !!tenantId.value && !!documentIdVal.value),
    staleTime: 300_000,
  })
}

export function useDocumentVersionQuery(
  documentId: Ref<string> | string,
  versionId: Ref<string | null | undefined> | string | null | undefined,
) {
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)
  const documentIdVal = computed(() =>
    typeof documentId === 'string' ? documentId : documentId.value,
  )
  const versionIdVal = computed(() => {
    if (versionId == null) return ''
    if (typeof versionId === 'string') return versionId
    return versionId.value ?? ''
  })

  return useQuery({
    queryKey: computed(() =>
      documentKeys.versionDetail(
        tenantId.value || '',
        documentIdVal.value || '',
        versionIdVal.value || '',
      ),
    ),
    queryFn: () => getDocumentVersion(tenantId.value!, documentIdVal.value!, versionIdVal.value!),
    enabled: computed(() => !!tenantId.value && !!documentIdVal.value && !!versionIdVal.value),
    staleTime: 300_000,
  })
}

export function useDocumentControlsQuery(
  documentId: Ref<string> | string,
  options?: Ref<{ limit?: number; offset?: number }> | { limit?: number; offset?: number },
) {
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)
  const documentIdVal = computed(() =>
    typeof documentId === 'string' ? documentId : documentId.value,
  )
  const optionsVal = computed(() => (options && 'value' in options ? options.value : options))

  return useQuery({
    queryKey: computed(() =>
      documentKeys.controls(tenantId.value || '', documentIdVal.value || '', optionsVal.value),
    ),
    queryFn: () => fetchDocumentControls(tenantId.value!, documentIdVal.value!, optionsVal.value),
    enabled: computed(() => !!tenantId.value && !!documentIdVal.value),
    staleTime: 300_000,
  })
}

export function useDocumentApprovalsQuery(
  documentId: Ref<string> | string,
  options?: Ref<{ limit?: number; offset?: number }> | { limit?: number; offset?: number },
) {
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)
  const documentIdVal = computed(() =>
    typeof documentId === 'string' ? documentId : documentId.value,
  )
  const optionsVal = computed(() => (options && 'value' in options ? options.value : options))

  return useQuery({
    queryKey: computed(() =>
      documentKeys.approvals(tenantId.value || '', documentIdVal.value || '', optionsVal.value),
    ),
    queryFn: () => fetchDocumentApprovals(tenantId.value!, documentIdVal.value!, optionsVal.value),
    enabled: computed(() => !!tenantId.value && !!documentIdVal.value),
    staleTime: 300_000,
  })
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
      if (res?.documents) {
        res.documents.forEach((doc) => mergeDocumentIntoStore(mapTenantDocumentToItem(doc)))
      }
      return res
    },
    enabled: computed(() => !!tenantId.value),
    staleTime: 300_000,
  })
}

export function useUpdateDocumentMutation() {
  const queryClient = useQueryClient()
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)

  return useMutation({
    mutationFn: ({ documentId, updates }: { documentId: string; updates: UpdateDocumentInput }) =>
      patchDocument(tenantId.value!, documentId, updates),
    onSuccess: (doc) => {
      mergeDocumentIntoStore(mapTenantDocumentToItem(doc))
      void queryClient.invalidateQueries({ queryKey: documentKeys.all })
    },
  })
}

export function useWriteDocumentMutation() {
  const queryClient = useQueryClient()
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)

  return useMutation({
    mutationFn: ({ documentId, input }: { documentId: string; input: WriteDocumentInput }) =>
      patchWriteDocument(tenantId.value!, documentId, input),
    onSuccess: (doc) => {
      mergeDocumentIntoStore(mapTenantDocumentDetailToItem(doc), true)
      void queryClient.invalidateQueries({ queryKey: documentKeys.all })
    },
  })
}

export function useUpdateDocumentApproversMutation() {
  const queryClient = useQueryClient()
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)
  const { updateDocument } = useDocuments()

  return useMutation({
    mutationFn: ({ documentId, approverIds }: { documentId: string; approverIds: string[] }) =>
      updateDocumentApprovers(tenantId.value!, documentId, { approverIds }),
    onSuccess: (_, { documentId, approverIds }) => {
      updateDocument(documentId, { approverIds })
      void queryClient.invalidateQueries({
        queryKey: documentKeys.detail(tenantId.value || '', documentId),
      })
    },
  })
}

export function usePublishDocumentMutation() {
  const queryClient = useQueryClient()
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)
  const { addActivity } = useDocuments()

  return useMutation({
    mutationFn: ({
      documentId,
      versionType,
      changeLog,
    }: {
      documentId: string
      versionType: 'major' | 'minor'
      changeLog: string
    }) =>
      versionType === 'major'
        ? publishDocumentMajor(tenantId.value!, documentId, { changeLog })
        : publishDocumentMinor(tenantId.value!, documentId, { changeLog }),
    onSuccess: (doc, { documentId, versionType }) => {
      mergeDocumentIntoStore(mapTenantDocumentDetailToItem(doc), true)
      const versionLabel = formatDocumentVersion(doc)
      const action =
        versionType === 'minor'
          ? `Published version ${versionLabel} (minor)`
          : doc.versionStatus === 'needs_review'
            ? `Requested approval for version ${versionLabel}`
            : `Published version ${versionLabel} (major)`
      addActivity(documentId, action)
      void queryClient.invalidateQueries({ queryKey: documentKeys.all })
    },
  })
}

export function useDecideDocumentApprovalMutation() {
  const queryClient = useQueryClient()
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)
  const { addActivity } = useDocuments()

  return useMutation({
    mutationFn: ({
      documentId,
      approvalRequestId,
      input,
    }: {
      documentId: string
      approvalRequestId: string
      input: DecideDocumentApprovalInput
    }) => patchDecideDocumentApproval(tenantId.value!, documentId, approvalRequestId, input),
    onSuccess: (request, { documentId, input }) => {
      const versionLabel = `v${request.major}.${request.minor}`
      addActivity(
        documentId,
        input.action === 'approve'
          ? `Approved version ${versionLabel}`
          : `Rejected version ${versionLabel}`,
      )
      void queryClient.invalidateQueries({ queryKey: documentKeys.all })
    },
  })
}
