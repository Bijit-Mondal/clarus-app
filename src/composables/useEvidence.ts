import { computed, type Ref } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  getEvidences,
  getTaskEvidences,
  getControlEvidences,
  createEvidence,
  uploadAttachment,
  deleteEvidence,
  downloadEvidence,
  type CreateEvidenceInput,
} from '@/api/evidence'
import { useOrganizationStore } from '@/stores/organization'

export const evidenceKeys = {
  all: ['evidences'] as const,
  list: (tenantId: string, options: Record<string, unknown>) =>
    [...evidenceKeys.all, tenantId, 'list', options] as const,
  taskList: (tenantId: string, taskId: string) =>
    [...evidenceKeys.all, tenantId, 'task', taskId] as const,
  controlList: (tenantId: string, controlId: string) =>
    [...evidenceKeys.all, tenantId, 'control', controlId] as const,
}

export function useEvidencesQuery(
  options?:
    | Ref<{ limit?: number; offset?: number; total?: boolean }>
    | { limit?: number; offset?: number; total?: boolean },
) {
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)
  const optionsVal = computed(() => (options && 'value' in options ? options.value : options))

  return useQuery({
    queryKey: computed(() => {
      const tId = tenantId.value || ''
      const opts = optionsVal.value || {}
      return evidenceKeys.list(tId, opts)
    }),
    queryFn: () => getEvidences(tenantId.value!, optionsVal.value),
    enabled: computed(() => !!tenantId.value),
    staleTime: 300_000,
  })
}

export function useTaskEvidencesQuery(taskId: Ref<string> | string) {
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)
  const taskIdVal = computed(() => (typeof taskId === 'string' ? taskId : taskId.value))

  return useQuery({
    queryKey: computed(() => {
      const tId = tenantId.value || ''
      const tTaskId = taskIdVal.value || ''
      return evidenceKeys.taskList(tId, tTaskId)
    }),
    queryFn: () => getTaskEvidences(tenantId.value!, taskIdVal.value!),
    enabled: computed(() => !!tenantId.value && !!taskIdVal.value),
    staleTime: 300_000,
  })
}

export function useControlEvidencesQuery(controlId: Ref<string> | string) {
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)
  const controlIdVal = computed(() => (typeof controlId === 'string' ? controlId : controlId.value))

  return useQuery({
    queryKey: computed(() => {
      const tId = tenantId.value || ''
      const cId = controlIdVal.value || ''
      return evidenceKeys.controlList(tId, cId)
    }),
    queryFn: () => getControlEvidences(tenantId.value!, controlIdVal.value!),
    enabled: computed(() => !!tenantId.value && !!controlIdVal.value),
    staleTime: 300_000,
  })
}

export function useCreateEvidenceMutation() {
  const queryClient = useQueryClient()
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)

  return useMutation({
    mutationFn: (input: CreateEvidenceInput) => createEvidence(tenantId.value!, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: evidenceKeys.all })
    },
  })
}

export function useUploadAttachmentMutation() {
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)

  return useMutation({
    mutationFn: (file: File) => uploadAttachment(tenantId.value!, file),
  })
}

export function useDeleteEvidenceMutation() {
  const queryClient = useQueryClient()
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)

  return useMutation({
    mutationFn: (evidenceId: string) => deleteEvidence(tenantId.value!, evidenceId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: evidenceKeys.all })
    },
  })
}

export function useDownloadEvidenceMutation() {
  const organizationStore = useOrganizationStore()
  const tenantId = computed(() => organizationStore.activeOrganization?.id)

  return useMutation({
    mutationFn: (evidenceId: string) => downloadEvidence(tenantId.value!, evidenceId),
  })
}
